<?php

namespace Tests\Feature\Phase1;

use App\Models\Order;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Phase0\Phase0TestCase;

class KitchenTest extends Phase0TestCase
{
    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        $coffee = $this->product();
        $toast = $this->product(['name' => 'Roti Bakar', 'station' => 'kitchen', 'price' => 15000]);

        $this->actingAsRole('cashier');
        $id = $this->postJson('/api/v1/admin/pos/orders', [
            'items' => [
                ['product_id' => $coffee->id, 'quantity' => 1],
                ['product_id' => $toast->id, 'quantity' => 1],
            ],
            'customer_name' => 'Sari',
            'fulfillment' => 'pickup',
            'pay_later' => true,
        ])->json('data.id');
        $this->order = Order::findOrFail($id);
    }

    private function pay(): void
    {
        $this->postJson("/api/v1/admin/orders/{$this->order->id}/payments", ['method' => 'cash'])->assertCreated();
    }

    private function itemId(string $station): int
    {
        return $this->order->items()->where('station', $station)->value('id');
    }

    public function test_unpaid_orders_never_reach_the_kitchen(): void
    {
        Sanctum::actingAs($this->staff('barista'));

        $this->getJson('/api/v1/admin/kds/queue')->assertOk()->assertJsonCount(0, 'data.orders');
        $this->postJson("/api/v1/admin/kds/orders/{$this->order->id}/items", ['item_ids' => [$this->itemId('bar')], 'status' => 'preparing'])
            ->assertStatus(422);
    }

    public function test_station_filter_and_order_status_follows_items(): void
    {
        $this->pay();
        Sanctum::actingAs($this->staff('barista'));

        $bar = $this->getJson('/api/v1/admin/kds/queue?station=bar')->assertOk();
        $bar->assertJsonCount(1, 'data.orders')->assertJsonCount(1, 'data.orders.0.items')
            ->assertJsonPath('data.orders.0.items.0.station', 'bar');

        $url = "/api/v1/admin/kds/orders/{$this->order->id}/items";

        $this->postJson($url, ['item_ids' => [$this->itemId('bar')], 'status' => 'preparing'])
            ->assertOk()->assertJsonPath('data.status', 'preparing');

        $this->postJson($url, ['item_ids' => [$this->itemId('bar')], 'status' => 'ready'])
            ->assertOk()->assertJsonPath('data.status', 'preparing'); // dapur belum selesai

        // Bar sudah selesai: pesanan hilang dari layar bar, tetap ada di layar dapur
        $this->getJson('/api/v1/admin/kds/queue?station=bar')->assertJsonCount(0, 'data.orders');
        $this->getJson('/api/v1/admin/kds/queue?station=kitchen')->assertJsonCount(1, 'data.orders');

        $this->postJson($url, ['item_ids' => [$this->itemId('kitchen')], 'status' => 'ready'])
            ->assertOk()->assertJsonPath('data.status', 'ready');

        $this->getJson('/api/v1/admin/handoff?fulfillment=pickup')->assertOk()->assertJsonCount(1, 'data.orders');
        $this->getJson('/api/v1/ready-board')->assertOk()->assertJsonPath('data.ready.0', $this->order->queue_number);

        // Urungkan (salah tekan): kembali ke preparing
        $this->postJson($url, ['item_ids' => [$this->itemId('kitchen')], 'status' => 'preparing'])
            ->assertOk()->assertJsonPath('data.status', 'preparing');
    }

    public function test_waiter_can_see_handoff_but_not_kitchen_queue(): void
    {
        Sanctum::actingAs($this->staff('waiter'));

        $this->getJson('/api/v1/admin/handoff')->assertOk();
        $this->getJson('/api/v1/admin/kds/queue')->assertForbidden();
        $this->getJson('/api/v1/admin/pos/menu')->assertForbidden();
    }
}
