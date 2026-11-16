<?php

namespace Tests\Feature\Phase0;

use App\Models\DiningTable;
use App\Models\Order;
use App\Support\StoreSettings;

class CheckoutTest extends Phase0TestCase
{
    public function test_order_is_priced_on_server_with_modifiers_tax_and_reserves_stock(): void
    {
        $product = $this->product();
        [, , $large] = $this->sizeGroup($product);

        $response = $this->placeOrder([
            ['product_id' => $product->id, 'quantity' => 2, 'modifier_ids' => [$large->id], 'notes' => 'less ice'],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pending_payment')
            ->assertJsonPath('data.payment_status', 'unpaid')
            ->assertJsonPath('data.subtotal', 50000)       // (20000 + 5000) x 2
            ->assertJsonPath('data.tax_amount', 5000)      // PB1 10%, harga belum termasuk pajak
            ->assertJsonPath('data.grand_total', 55000)
            ->assertJsonPath('data.customer_name', 'Budi')
            ->assertJsonPath('data.channel', 'online')
            ->assertJsonPath('data.queue_number', 1);

        $this->assertNotEmpty($response->json('access_token'));
        $this->assertSame(8, $product->fresh()->stock_quantity);
        $this->assertSame('Large', $response->json('data.items.0.modifiers.0.name'));
    }

    public function test_service_charge_and_rounding_follow_settings(): void
    {
        StoreSettings::set(['service_charge_enabled' => true, 'service_charge_rate' => 5, 'rounding' => 500]);
        $product = $this->product(['price' => 18000]);

        // 18000 + 900 service = 18900; pajak 1890 -> 20790 -> dibulatkan ke 21000
        $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]])
            ->assertCreated()
            ->assertJsonPath('data.service_charge', 900)
            ->assertJsonPath('data.tax_amount', 1890)
            ->assertJsonPath('data.rounding', 210)
            ->assertJsonPath('data.grand_total', 21000);
    }

    public function test_required_modifier_must_be_chosen(): void
    {
        $product = $this->product();
        $this->sizeGroup($product);

        $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]])
            ->assertStatus(422);
    }

    public function test_modifier_from_another_product_is_rejected(): void
    {
        $product = $this->product();
        $other = $this->product(['name' => 'Teh']);
        [, , $large] = $this->sizeGroup($other);

        $this->placeOrder([['product_id' => $product->id, 'quantity' => 1, 'modifier_ids' => [$large->id]]])
            ->assertStatus(422);
    }

    public function test_cannot_order_more_than_stock_or_sold_out_product(): void
    {
        $product = $this->product(['stock_quantity' => 1]);

        // Dua baris produk yang sama dijumlahkan sebelum dicek
        $this->placeOrder([
            ['product_id' => $product->id, 'quantity' => 1],
            ['product_id' => $product->id, 'quantity' => 1],
        ])->assertStatus(422);

        $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]])->assertCreated();
        $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]])->assertStatus(422);
        $this->assertSame(0, $product->fresh()->stock_quantity);

        $manual = $this->product(['name' => 'Croissant', 'is_available' => false]);
        $this->placeOrder([['product_id' => $manual->id, 'quantity' => 1]])->assertStatus(422);
    }

    public function test_idempotency_key_prevents_duplicate_orders(): void
    {
        $product = $this->product();
        $headers = ['Idempotency-Key' => 'checkout-abc-12345'];

        $first = $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]], [], $headers)->assertCreated();
        $second = $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]], [], $headers)->assertCreated();

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame(1, Order::count());
        $this->assertSame(9, $product->fresh()->stock_quantity);
    }

    public function test_orders_are_rejected_when_store_is_closed(): void
    {
        StoreSettings::set(['temporarily_closed' => true]);
        $product = $this->product();

        $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]])->assertStatus(422);
    }

    public function test_qr_table_order_is_linked_to_table_and_invalid_token_rejected(): void
    {
        $product = $this->product();
        $table = DiningTable::create(['name' => 'Meja 5']);

        $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]], ['table_token' => $table->qr_token])
            ->assertCreated()
            ->assertJsonPath('data.channel', 'qr')
            ->assertJsonPath('data.fulfillment', 'table')
            ->assertJsonPath('data.dining_table.name', 'Meja 5');

        $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]], ['table_token' => 'palsu'])
            ->assertStatus(422);
    }

    public function test_order_status_page_requires_access_token(): void
    {
        $product = $this->product();
        $response = $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]]);
        $number = $response->json('data.order_number');
        $token = $response->json('access_token');

        $this->getJson("/api/v1/orders/{$number}")->assertNotFound();
        $this->getJson("/api/v1/orders/{$number}?token=salah")->assertNotFound();
        $this->getJson("/api/v1/orders/{$number}?token={$token}")->assertOk()->assertJsonPath('data.order_number', $number);
    }
}
