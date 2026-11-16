<?php

namespace Tests\Feature\Phase0;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Support\Facades\Artisan;

class OrderLifecycleTest extends Phase0TestCase
{
    private function pendingOrder(int $qty = 1): Order
    {
        $product = $this->product();
        $id = $this->placeOrder([['product_id' => $product->id, 'quantity' => $qty]])->json('data.id');

        return Order::findOrFail($id);
    }

    public function test_cashier_records_cash_payment_and_order_enters_queue(): void
    {
        $order = $this->pendingOrder(); // total 22000
        $this->actingAsRole('cashier');

        $this->postJson("/api/v1/admin/orders/{$order->id}/payments", ['method' => 'cash', 'tendered' => 50000])
            ->assertCreated()
            ->assertJsonPath('data.payment.change', 28000)
            ->assertJsonPath('data.order.status', 'queued')
            ->assertJsonPath('data.order.payment_status', 'paid');
    }

    public function test_split_payment_only_queues_order_when_fully_paid(): void
    {
        $order = $this->pendingOrder();
        $this->actingAsRole('cashier');

        $this->postJson("/api/v1/admin/orders/{$order->id}/payments", ['method' => 'cash', 'amount' => 10000])
            ->assertCreated()
            ->assertJsonPath('data.order.status', 'pending_payment');

        $this->postJson("/api/v1/admin/orders/{$order->id}/payments", ['method' => 'edc', 'amount' => 12000, 'reference' => 'EDC-778'])
            ->assertCreated()
            ->assertJsonPath('data.order.status', 'queued');

        // Tidak bisa bayar lagi setelah lunas
        $this->postJson("/api/v1/admin/orders/{$order->id}/payments", ['method' => 'cash'])->assertStatus(422);
    }

    public function test_status_moves_forward_only(): void
    {
        $order = $this->pendingOrder();
        $this->actingAsRole('owner');

        // Belum lunas tidak boleh langsung dibuat/selesai
        $this->putJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'preparing'])->assertStatus(422);
        $this->putJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'completed'])->assertStatus(422);
        // Status lama yang bebas tidak diterima lagi
        $this->putJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'paid'])->assertStatus(422);

        $this->postJson("/api/v1/admin/orders/{$order->id}/payments", ['method' => 'cash'])->assertCreated();

        foreach (['preparing', 'ready', 'completed'] as $status) {
            $this->putJson("/api/v1/admin/orders/{$order->id}/status", ['status' => $status])
                ->assertOk()->assertJsonPath('data.status', $status);
        }

        $this->putJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'preparing'])->assertStatus(422);
        $this->assertSame(['pending_payment', 'queued', 'preparing', 'ready', 'completed'], $order->statusLogs()->pluck('to')->all());
    }

    public function test_cancelling_paid_order_needs_manager_pin_and_creates_refund(): void
    {
        $order = $this->pendingOrder(2);
        $productId = $order->items()->first()->product_id;
        $manager = $this->staff('manager', ['username' => 'mgr', 'pin' => '246810']);
        $this->actingAsRole('cashier');

        $this->postJson("/api/v1/admin/orders/{$order->id}/payments", ['method' => 'cash'])->assertCreated();

        $this->postJson("/api/v1/admin/orders/{$order->id}/cancel", ['reason' => 'Salah input'])->assertStatus(422);
        $this->postJson("/api/v1/admin/orders/{$order->id}/cancel", [
            'reason' => 'Salah input', 'approver_username' => 'mgr', 'approver_pin' => '000000',
        ])->assertStatus(422);

        $this->postJson("/api/v1/admin/orders/{$order->id}/cancel", [
            'reason' => 'Salah input', 'approver_username' => 'mgr', 'approver_pin' => '246810',
        ])->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.payment_status', 'refunded')
            ->assertJsonPath('data.refunds.0.amount', 44000)
            ->assertJsonPath('data.refunds.0.approved_by', $manager->id);

        // Dibatalkan sebelum dibuat: stok kembali
        $this->assertSame(10, \App\Models\Product::find($productId)->stock_quantity);
    }

    public function test_cancelling_unpaid_order_needs_no_pin(): void
    {
        $order = $this->pendingOrder();
        $this->actingAsRole('cashier');

        $this->postJson("/api/v1/admin/orders/{$order->id}/cancel", ['reason' => 'Pelanggan batal'])
            ->assertOk()->assertJsonPath('data.payment_status', 'unpaid');
    }

    public function test_auto_cancel_only_touches_expired_unpaid_orders(): void
    {
        $expired = $this->pendingOrder();
        $fresh = $this->pendingOrder();
        $paid = $this->pendingOrder();
        $productId = $expired->items()->first()->product_id;

        $this->actingAsRole('cashier');
        $this->postJson("/api/v1/admin/orders/{$paid->id}/payments", ['method' => 'cash'])->assertCreated();

        Order::whereKey([$expired->id, $paid->id])->update(['payment_due_at' => now()->subMinute()]);
        Order::whereKey($fresh->id)->update(['payment_due_at' => now()->addMinutes(10)]);

        Artisan::call('orders:auto-cancel');

        $this->assertSame(OrderStatus::Cancelled, $expired->fresh()->status);
        $this->assertSame(OrderStatus::PendingPayment, $fresh->fresh()->status);
        $this->assertSame(OrderStatus::Queued, $paid->fresh()->status);
        $this->assertSame('paid', $paid->fresh()->payment_status->value);
        // Stok produk pesanan yang kedaluwarsa dikembalikan ke 10
        $this->assertSame(10, \App\Models\Product::find($productId)->stock_quantity);
    }
}
