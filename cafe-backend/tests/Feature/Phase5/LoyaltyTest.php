<?php

namespace Tests\Feature\Phase5;

use App\Events\OrderTracking;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\User;
use App\Support\StoreSettings;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Phase0\Phase0TestCase;

class LoyaltyTest extends Phase0TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        StoreSettings::set([
            'loyalty_enabled' => true,
            'loyalty_earn_amount' => 10000,
            'loyalty_point_value' => 100,
            'loyalty_min_redeem' => 50,
            'loyalty_max_redeem_percent' => 50,
        ]);
    }

    private function member(int $points = 0): User
    {
        $user = User::create(['name' => 'Rina', 'username' => 'rina' . uniqid(), 'email' => uniqid() . '@mail.test', 'password' => 'password', 'role' => 'customer', 'phone_number' => '08' . random_int(100000000, 999999999)]);
        $user->forceFill(['loyalty_points' => $points])->save();

        return $user;
    }

    public function test_member_earns_points_when_pos_order_is_paid(): void
    {
        $product = $this->product(); // 20000 x2 + pajak = 44000 -> 4 poin
        $member = $this->member();
        $this->actingAsRole('cashier');

        $this->postJson('/api/v1/admin/pos/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'customer_name' => 'Rina', 'fulfillment' => 'pickup', 'member_id' => $member->id,
            'payments' => [['method' => 'cash', 'amount' => 44000, 'tendered' => 50000]],
        ])->assertCreated()->assertJsonPath('data.points_earned', 4);

        $this->assertSame(4, $member->fresh()->loyalty_points);
    }

    public function test_redeem_points_with_cap_and_revert_on_cancel(): void
    {
        $product = $this->product(); // 20000
        $member = $this->member(300);
        Sanctum::actingAs($member);

        // 300 poin = Rp30.000, tapi maksimal 50% dari 20000 -> 100 poin (Rp10.000) dipakai
        $quote = $this->postJson('/api/v1/orders/quote', ['items' => [['product_id' => $product->id, 'quantity' => 1]], 'redeem_points' => 300])
            ->assertOk()->json('data');
        $this->assertSame(100, $quote['points_redeemed']);
        $this->assertSame(10000, $quote['points_discount']);

        $order = $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]], ['redeem_points' => 300])
            ->assertCreated()
            ->assertJsonPath('data.points_redeemed', 100)
            ->assertJsonPath('data.grand_total', 11000) // (20000 - 10000) + pajak
            ->json('data');
        $this->assertSame(200, $member->fresh()->loyalty_points);

        $this->actingAsRole('cashier');
        $this->postJson("/api/v1/admin/orders/{$order['id']}/cancel", ['reason' => 'Batal'])->assertOk();
        $this->assertSame(300, $member->fresh()->loyalty_points);
    }

    public function test_minimum_redeem_and_disabled_program(): void
    {
        $product = $this->product();
        $member = $this->member(30);
        Sanctum::actingAs($member);

        $this->postJson('/api/v1/orders/quote', ['items' => [['product_id' => $product->id, 'quantity' => 1]], 'redeem_points' => 30])
            ->assertStatus(422)->assertJsonValidationErrors('redeem_points');

        StoreSettings::set(['loyalty_enabled' => false]);
        $member->forceFill(['loyalty_points' => 500])->save();
        $this->postJson('/api/v1/orders/quote', ['items' => [['product_id' => $product->id, 'quantity' => 1]], 'redeem_points' => 100])
            ->assertStatus(422);
    }

    public function test_refund_reverts_earned_points(): void
    {
        $product = $this->product();
        $member = $this->member();
        $this->actingAsRole('manager');

        $order = $this->postJson('/api/v1/admin/pos/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 5]], // 110000 -> 11 poin
            'customer_name' => 'Rina', 'fulfillment' => 'pickup', 'member_id' => $member->id,
            'payments' => [['method' => 'cash', 'amount' => 110000, 'tendered' => 110000]],
        ])->json('data');
        $this->assertSame(11, $member->fresh()->loyalty_points);

        // Refund 1 item = 22000 -> tarik 2 poin
        $this->postJson("/api/v1/admin/orders/{$order['id']}/refunds", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]], 'reason' => 'Tumpah', 'method' => 'cash',
        ])->assertCreated();

        $this->assertSame(9, $member->fresh()->loyalty_points);
        $this->assertSame(['earn', 'revert'], LoyaltyTransaction::where('user_id', $member->id)->orderBy('id')->pluck('type')->all());
    }

    public function test_cashier_finds_and_registers_members_by_phone(): void
    {
        $this->actingAsRole('cashier');

        $id = $this->postJson('/api/v1/admin/pos/members', ['name' => 'Budi', 'phone_number' => '0812-3333-4444'])
            ->assertCreated()->json('data.id');
        $this->postJson('/api/v1/admin/pos/members', ['name' => 'Budi lagi', 'phone_number' => '081233334444'])->assertStatus(422);

        $this->getJson('/api/v1/admin/pos/members?q=33334444')->assertOk()->assertJsonPath('data.0.id', $id);
        $this->getJson('/api/v1/admin/pos/members?q=budi')->assertOk()->assertJsonPath('data.0.phone_number', '081233334444');
    }

    public function test_owner_adjusts_points_and_customer_sees_history(): void
    {
        $member = $this->member(10);
        $this->actingAsRole('owner');
        $this->postJson("/api/v1/admin/members/{$member->id}/points", ['points' => 40, 'note' => 'Kompensasi'])
            ->assertOk()->assertJsonPath('data.points', 50);

        Sanctum::actingAs($member->fresh());
        $this->getJson('/api/v1/my-loyalty')->assertOk()
            ->assertJsonPath('data.points', 50)
            ->assertJsonPath('data.transactions.0.note', 'Kompensasi');
    }

    public function test_status_changes_are_broadcast_to_customer_tracking_channel(): void
    {
        Event::fake([OrderTracking::class]);
        $product = $this->product();
        $order = Order::find($this->placeOrder([['product_id' => $product->id, 'quantity' => 1]])->json('data.id'));

        $this->actingAsRole('cashier');
        $this->postJson("/api/v1/admin/orders/{$order->id}/payments", ['method' => 'cash'])->assertCreated();

        Event::assertDispatched(OrderTracking::class, function (OrderTracking $event) use ($order) {
            return $event->broadcastOn()[0]->name === 'order.' . $order->access_token
                && $event->broadcastWith()['status'] === 'queued'
                && ! array_key_exists('customer_phone', $event->broadcastWith());
        });
    }
}
