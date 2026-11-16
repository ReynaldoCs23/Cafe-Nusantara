<?php

namespace Tests\Feature\Phase1;

use App\Models\DiningTable;
use App\Models\Order;
use Tests\Feature\Phase0\Phase0TestCase;

class PosAndShiftTest extends Phase0TestCase
{
    public function test_payment_requires_open_shift(): void
    {
        $product = $this->product();
        $orderId = $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]])->json('data.id');
        $this->actingAsRole('cashier', openShift: false);

        $this->postJson("/api/v1/admin/orders/{$orderId}/payments", ['method' => 'cash'])
            ->assertStatus(422)->assertJsonValidationErrors('shift');

        $this->postJson('/api/v1/admin/pos/shift/open', ['opening_cash' => 200000])->assertCreated();
        $this->postJson('/api/v1/admin/pos/shift/open', ['opening_cash' => 0])->assertStatus(422); // sudah terbuka
        $this->postJson("/api/v1/admin/orders/{$orderId}/payments", ['method' => 'cash'])->assertCreated();
    }

    public function test_pos_order_is_created_and_paid_in_one_step(): void
    {
        $product = $this->product();
        [, , $large] = $this->sizeGroup($product);
        $this->actingAsRole('cashier');

        // (20000 + 5000) x 2 = 50000 + PB1 10% = 55000
        $this->postJson('/api/v1/admin/pos/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 2, 'modifier_ids' => [$large->id]]],
            'customer_name' => 'Walk-in',
            'fulfillment' => 'pickup',
            'payments' => [['method' => 'cash', 'amount' => 55000, 'tendered' => 60000]],
        ])->assertCreated()
            ->assertJsonPath('data.channel', 'pos')
            ->assertJsonPath('data.status', 'queued')
            ->assertJsonPath('data.grand_total', 55000)
            ->assertJsonPath('data.payments.0.change', 5000);
    }

    public function test_underpaid_pos_order_is_rolled_back_including_stock(): void
    {
        $product = $this->product();
        $this->actingAsRole('cashier');

        $this->postJson('/api/v1/admin/pos/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 3]],
            'customer_name' => 'Walk-in',
            'fulfillment' => 'pickup',
            'payments' => [['method' => 'cash', 'amount' => 10000, 'tendered' => 10000]],
        ])->assertStatus(422)->assertJsonValidationErrors('payments');

        $this->assertSame(0, Order::count());
        $this->assertSame(10, $product->fresh()->stock_quantity);
    }

    public function test_pos_table_order_and_pay_later(): void
    {
        $product = $this->product();
        $table = DiningTable::create(['name' => 'Meja 3']);
        $this->actingAsRole('cashier');

        $this->postJson('/api/v1/admin/pos/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'customer_name' => 'Rombongan',
            'fulfillment' => 'table',
            'dining_table_id' => $table->id,
            'pay_later' => true,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending_payment')
            ->assertJsonPath('data.dining_table.name', 'Meja 3')
            ->assertJsonPath('data.payment_due_at', null);
    }

    public function test_shift_close_calculates_expected_cash_and_difference(): void
    {
        $product = $this->product(); // 20000 + 2000 pajak = 22000
        $this->actingAsRole('cashier'); // modal 100000

        foreach ([['cash', null], ['edc', 'EDC-1']] as [$method, $ref]) {
            $this->postJson('/api/v1/admin/pos/orders', [
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'customer_name' => 'Tamu',
                'fulfillment' => 'pickup',
                'payments' => [['method' => $method, 'amount' => 22000, 'tendered' => $method === 'cash' ? 50000 : null, 'reference' => $ref]],
            ])->assertCreated();
        }

        $this->postJson('/api/v1/admin/pos/shift/movements', ['type' => 'out', 'amount' => 15000, 'reason' => 'Beli es batu'])->assertCreated();
        $this->postJson('/api/v1/admin/pos/shift/movements', ['type' => 'out', 'amount' => 999999, 'reason' => 'Terlalu besar'])->assertStatus(422);

        $summary = $this->getJson('/api/v1/admin/pos/shift')->assertOk()->json('data.summary');
        $this->assertSame(107000, $summary['expected_cash']); // 100000 + 22000 - 15000
        $this->assertSame(22000, $summary['by_method']['edc']['amount']);

        $this->postJson('/api/v1/admin/pos/shift/close', ['counted_cash' => 105000, 'notes' => 'Kurang 2rb'])
            ->assertOk()
            ->assertJsonPath('data.expected_cash', 107000)
            ->assertJsonPath('data.difference', -2000);

        $this->getJson('/api/v1/admin/pos/shift')->assertOk()->assertJsonPath('data', null);
    }

    public function test_void_item_before_payment_recalculates_total_and_restores_stock(): void
    {
        $coffee = $this->product();
        $tea = $this->product(['name' => 'Teh', 'price' => 10000]);
        $order = $this->placeOrder([
            ['product_id' => $coffee->id, 'quantity' => 1],
            ['product_id' => $tea->id, 'quantity' => 2],
        ])->json('data');
        $teaItem = collect($order['items'])->firstWhere('product_name', 'Teh');
        $this->actingAsRole('cashier');

        $this->postJson("/api/v1/admin/pos/order-items/{$teaItem['id']}/void", ['reason' => 'Pelanggan batal teh'])
            ->assertOk()
            ->assertJsonPath('data.subtotal', 20000)
            ->assertJsonPath('data.grand_total', 22000);

        $this->assertSame(10, $tea->fresh()->stock_quantity);

        $coffeeItem = collect($order['items'])->firstWhere('product_name', 'Kopi Susu');
        $this->postJson("/api/v1/admin/pos/order-items/{$coffeeItem['id']}/void", ['reason' => 'Item terakhir'])
            ->assertStatus(422);
    }

    public function test_receipt_contains_store_and_payment_data(): void
    {
        $product = $this->product();
        $this->actingAsRole('cashier');
        $id = $this->postJson('/api/v1/admin/pos/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'customer_name' => 'Tamu',
            'fulfillment' => 'pickup',
            'payments' => [['method' => 'cash', 'amount' => 22000, 'tendered' => 22000]],
        ])->json('data.id');

        $this->getJson("/api/v1/admin/pos/orders/{$id}/receipt")
            ->assertOk()
            ->assertJsonPath('data.store.store_name', 'Cafe Nusantara')
            ->assertJsonPath('data.order.payments.0.method', 'cash');
    }
}
