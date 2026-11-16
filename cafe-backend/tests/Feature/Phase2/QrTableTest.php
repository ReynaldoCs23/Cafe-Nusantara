<?php

namespace Tests\Feature\Phase2;

use App\Models\DiningTable;
use App\Models\Order;
use App\Support\StoreSettings;
use Tests\Feature\Phase0\Phase0TestCase;

class QrTableTest extends Phase0TestCase
{
    public function test_scanning_a_valid_qr_returns_only_public_table_info(): void
    {
        $table = DiningTable::create(['name' => 'Meja 7', 'area' => 'Teras']);

        $this->getJson("/api/v1/tables/{$table->qr_token}")
            ->assertOk()
            ->assertExactJson(['data' => ['id' => $table->id, 'name' => 'Meja 7', 'area' => 'Teras']]);
    }

    public function test_inactive_table_and_unknown_token_are_rejected(): void
    {
        $table = DiningTable::create(['name' => 'Meja 8', 'is_active' => false]);
        $product = $this->product();

        $this->getJson("/api/v1/tables/{$table->qr_token}")->assertNotFound();
        $this->getJson('/api/v1/tables/token-ngawur')->assertNotFound();
        $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]], ['table_token' => $table->qr_token])->assertStatus(422);
    }

    public function test_rotating_qr_invalidates_the_old_code(): void
    {
        $table = DiningTable::create(['name' => 'Meja 9']);
        $old = $table->qr_token;
        $this->actingAsRole('manager');

        $new = $this->postJson("/api/v1/admin/tables/{$table->id}/rotate-qr")->assertOk()->json('data.qr_token');

        $this->assertNotSame($old, $new);
        $this->getJson("/api/v1/tables/{$old}")->assertNotFound();
        $this->getJson("/api/v1/tables/{$new}")->assertOk();
    }

    public function test_cashier_cannot_manage_tables(): void
    {
        $table = DiningTable::create(['name' => 'Meja 10']);
        $this->actingAsRole('cashier');

        $this->postJson("/api/v1/admin/tables/{$table->id}/rotate-qr")->assertForbidden();
        $this->postJson('/api/v1/admin/tables', ['name' => 'Meja 11'])->assertForbidden();
    }

    public function test_qr_order_can_choose_pickup_and_expires_when_unpaid(): void
    {
        StoreSettings::set(['qr_payment_timeout_minutes' => 20]);
        $table = DiningTable::create(['name' => 'Meja 12']);
        $product = $this->product();

        $response = $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]], [
            'table_token' => $table->qr_token,
            'fulfillment' => 'pickup',
        ])->assertCreated()
            ->assertJsonPath('data.channel', 'qr')
            ->assertJsonPath('data.fulfillment', 'pickup')
            ->assertJsonPath('data.dining_table_id', null);

        $order = Order::find($response->json('data.id'));
        $this->assertEqualsWithDelta(20, now()->diffInMinutes($order->payment_due_at), 1);

        // Toko publik mengirim batas waktu agar pelanggan melihat angka yang benar
        $this->getJson('/api/v1/store/status')->assertJsonPath('data.qr_payment_timeout_minutes', 20);
    }

    public function test_qr_orders_are_rejected_when_store_closed(): void
    {
        StoreSettings::set(['temporarily_closed' => true]);
        $table = DiningTable::create(['name' => 'Meja 13']);
        $product = $this->product();

        $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]], ['table_token' => $table->qr_token])
            ->assertStatus(422)->assertJsonValidationErrors('store');
    }
}
