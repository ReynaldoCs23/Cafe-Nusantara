<?php

namespace Tests\Feature\Phase5;

use App\Models\Category;
use App\Models\Order;
use App\Models\Promotion;
use Carbon\CarbonImmutable;
use Tests\Feature\Phase0\Phase0TestCase;

class PromotionTest extends Phase0TestCase
{
    private function items($product, int $qty = 1): array
    {
        return [['product_id' => $product->id, 'quantity' => $qty]];
    }

    public function test_best_automatic_promo_is_applied_and_tax_recalculated(): void
    {
        $product = $this->product(); // 20000
        Promotion::create(['name' => 'Diskon 10%', 'type' => 'percent', 'value' => 10, 'scope' => 'order']);
        Promotion::create(['name' => 'Potong 5rb', 'type' => 'amount', 'value' => 5000, 'scope' => 'order']);

        // subtotal 40000: 10% = 4000 < 5000 -> pakai "Potong 5rb"; 35000 + pajak 3500 = 38500
        $this->placeOrder($this->items($product, 2))
            ->assertCreated()
            ->assertJsonPath('data.promotion_name', 'Potong 5rb')
            ->assertJsonPath('data.promo_discount', 5000)
            ->assertJsonPath('data.grand_total', 38500);

        $this->assertSame(1, Promotion::where('name', 'Potong 5rb')->value('used_count'));
    }

    public function test_happy_hour_only_applies_within_time_window(): void
    {
        $product = $this->product();
        Promotion::create(['name' => 'Happy hour', 'type' => 'percent', 'value' => 20, 'scope' => 'order', 'start_time' => '14:00', 'end_time' => '16:00']);

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-18 15:00', 'Asia/Jakarta'));
        $this->postJson('/api/v1/orders/quote', ['items' => $this->items($product)])
            ->assertOk()->assertJsonPath('data.promo_discount', 4000);

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-18 17:00', 'Asia/Jakarta'));
        $this->postJson('/api/v1/orders/quote', ['items' => $this->items($product)])
            ->assertOk()->assertJsonPath('data.promo_discount', 0)->assertJsonPath('data.promotion', null);

        CarbonImmutable::setTestNow();
    }

    public function test_category_scope_and_buy_x_get_y(): void
    {
        $coffee = $this->product(['price' => 20000]);
        $pastryCat = Category::create(['name' => 'Pastry', 'slug' => 'pastry']);
        $croissant = $this->product(['name' => 'Croissant', 'price' => 15000, 'category_id' => $pastryCat->id]);

        Promotion::create(['name' => 'Pastry beli 2 gratis 1', 'type' => 'bogo', 'buy_quantity' => 2, 'get_quantity' => 1, 'scope' => 'category', 'scope_ids' => [$pastryCat->id]]);

        // 3 croissant -> 1 gratis (15000); kopi tidak ikut promo
        $this->postJson('/api/v1/orders/quote', ['items' => [
            ['product_id' => $coffee->id, 'quantity' => 1],
            ['product_id' => $croissant->id, 'quantity' => 3],
        ]])->assertOk()->assertJsonPath('data.promo_discount', 15000)->assertJsonPath('data.promotion.summary', 'Beli 2 gratis 1');

        // 2 croissant belum cukup
        $this->postJson('/api/v1/orders/quote', ['items' => [['product_id' => $croissant->id, 'quantity' => 2]]])
            ->assertOk()->assertJsonPath('data.promo_discount', 0);
    }

    public function test_voucher_code_quota_min_subtotal_and_channel(): void
    {
        $product = $this->product();
        Promotion::create(['name' => 'Voucher teman', 'type' => 'amount', 'value' => 10000, 'scope' => 'order', 'code' => 'TEMAN10', 'quota' => 1, 'min_subtotal' => 30000, 'channels' => ['online', 'qr']]);

        $this->postJson('/api/v1/orders/quote', ['items' => $this->items($product), 'voucher_code' => 'teman10'])
            ->assertStatus(422)->assertJsonValidationErrors('voucher_code'); // belum minimal belanja

        $this->postJson('/api/v1/orders/quote', ['items' => $this->items($product, 2), 'voucher_code' => 'SALAH'])
            ->assertStatus(422);

        $this->placeOrder($this->items($product, 2), ['voucher_code' => 'teman10'])
            ->assertCreated()->assertJsonPath('data.voucher_code', 'TEMAN10')->assertJsonPath('data.promo_discount', 10000);

        // Kuota 1 sudah terpakai
        $this->placeOrder($this->items($product, 2), ['voucher_code' => 'TEMAN10'])->assertStatus(422);

        // Kanal kasir tidak termasuk
        Promotion::where('code', 'TEMAN10')->update(['quota' => null]);
        $this->actingAsRole('cashier');
        $this->postJson('/api/v1/admin/pos/quote', ['items' => $this->items($product, 2), 'voucher_code' => 'TEMAN10'])->assertStatus(422);
    }

    public function test_cancelling_unpaid_order_releases_voucher_quota(): void
    {
        $product = $this->product();
        Promotion::create(['name' => 'Sekali pakai', 'type' => 'percent', 'value' => 50, 'scope' => 'order', 'code' => 'SEKALI', 'quota' => 1]);

        $id = $this->placeOrder($this->items($product), ['voucher_code' => 'SEKALI'])->json('data.id');
        $this->actingAsRole('cashier');
        $this->postJson("/api/v1/admin/orders/{$id}/cancel", ['reason' => 'Pelanggan batal'])->assertOk();

        $this->assertSame(0, Promotion::where('code', 'SEKALI')->value('used_count'));
    }

    public function test_promo_dropped_when_void_makes_order_ineligible(): void
    {
        $coffee = $this->product();
        $tea = $this->product(['name' => 'Teh', 'price' => 10000]);
        Promotion::create(['name' => 'Min 25rb', 'type' => 'amount', 'value' => 5000, 'scope' => 'order', 'min_subtotal' => 25000]);

        $order = $this->placeOrder([['product_id' => $coffee->id, 'quantity' => 1], ['product_id' => $tea->id, 'quantity' => 1]])
            ->assertJsonPath('data.promo_discount', 5000)->json('data');
        $teaItem = collect($order['items'])->firstWhere('product_name', 'Teh');

        $this->actingAsRole('cashier');
        $this->postJson("/api/v1/admin/pos/order-items/{$teaItem['id']}/void", ['reason' => 'Batal teh'])
            ->assertOk()->assertJsonPath('data.promo_discount', 0)->assertJsonPath('data.grand_total', 22000);

        $this->assertSame(0, Promotion::first()->used_count);
    }

    public function test_admin_promotion_crud_and_public_listing_hides_vouchers(): void
    {
        $this->actingAsRole('manager');
        $this->postJson('/api/v1/admin/promotions', ['name' => 'Kopi pagi', 'type' => 'percent', 'value' => 15, 'scope' => 'order', 'days' => ['mon', 'tue']])
            ->assertCreated()->assertJsonPath('data.summary', 'Diskon 15%');
        $this->postJson('/api/v1/admin/promotions', ['name' => 'Rahasia', 'type' => 'amount', 'value' => 5000, 'scope' => 'order', 'code' => 'rahasia'])
            ->assertCreated()->assertJsonPath('data.code', 'RAHASIA');
        $this->postJson('/api/v1/admin/promotions', ['name' => 'Salah', 'type' => 'bogo', 'buy_quantity' => 1, 'get_quantity' => 1, 'scope' => 'order'])
            ->assertStatus(422);

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-16 10:00', 'Asia/Jakarta')); // Senin
        $names = collect($this->getJson('/api/v1/promotions')->json('data'))->pluck('name');
        $this->assertTrue($names->contains('Kopi pagi'));
        $this->assertFalse($names->contains('Rahasia'));
        CarbonImmutable::setTestNow();

        $this->assertSame(2, Order::count() + 2);
    }
}
