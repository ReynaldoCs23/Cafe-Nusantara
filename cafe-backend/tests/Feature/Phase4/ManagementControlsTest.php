<?php

namespace Tests\Feature\Phase4;

use App\Models\AuditLog;
use App\Models\Order;
use App\Support\StoreSettings;
use Tests\Feature\Phase0\Phase0TestCase;

class ManagementControlsTest extends Phase0TestCase
{
    private function posOrder(array $extra = [], int $qty = 2): \Illuminate\Testing\TestResponse
    {
        $product = $this->product(); // 20000

        return $this->postJson('/api/v1/admin/pos/orders', array_merge([
            'items' => [['product_id' => $product->id, 'quantity' => $qty]],
            'customer_name' => 'Tamu',
            'fulfillment' => 'pickup',
            'pay_later' => true,
        ], $extra));
    }

    /* ---------- Diskon (PRM-01) ---------- */

    public function test_small_discount_by_cashier_is_allowed_and_recalculates_tax(): void
    {
        $this->actingAsRole('cashier');

        // subtotal 40000 - diskon 10% (4000) = 36000 + pajak 3600 = 39600
        $this->posOrder(['discount' => ['type' => 'percent', 'value' => 10, 'reason' => 'Pelanggan tetap']])
            ->assertCreated()
            ->assertJsonPath('data.discount_total', 4000)
            ->assertJsonPath('data.tax_amount', 3600)
            ->assertJsonPath('data.grand_total', 39600);

        $this->assertTrue(AuditLog::where('action', 'order.discount')->exists());
    }

    public function test_large_discount_by_cashier_needs_manager_pin(): void
    {
        StoreSettings::set(['discount_approval_percent' => 10]);
        $this->staff('manager', ['username' => 'mgr', 'pin' => '135790']);
        $this->actingAsRole('cashier');

        $discount = ['type' => 'amount', 'value' => 10000, 'reason' => 'Komplain pelanggan']; // 25%

        $this->posOrder(['discount' => $discount])->assertStatus(422)->assertJsonValidationErrors('approver_pin');
        $this->assertSame(0, Order::count());

        $this->posOrder(['discount' => $discount, 'approver_username' => 'mgr', 'approver_pin' => '135790'])
            ->assertCreated()
            ->assertJsonPath('data.discount_total', 10000)
            ->assertJsonPath('data.grand_total', 33000);
    }

    public function test_discount_on_pending_order_and_removal(): void
    {
        $this->actingAsRole('manager');
        $id = $this->posOrder()->json('data.id');

        $this->postJson("/api/v1/admin/orders/{$id}/discount", ['type' => 'percent', 'value' => 50, 'reason' => 'Promo pembukaan'])
            ->assertOk()->assertJsonPath('data.discount_total', 20000)->assertJsonPath('data.grand_total', 22000);

        $this->postJson("/api/v1/admin/orders/{$id}/discount", ['type' => 'none'])
            ->assertOk()->assertJsonPath('data.discount_total', 0)->assertJsonPath('data.grand_total', 44000);

        // Setelah dibayar, diskon tidak bisa diubah
        $this->postJson("/api/v1/admin/orders/{$id}/payments", ['method' => 'cash'])->assertCreated();
        $this->postJson("/api/v1/admin/orders/{$id}/discount", ['type' => 'percent', 'value' => 5, 'reason' => 'Telat'])->assertStatus(422);
    }

    /* ---------- Refund per item (RFD-03) ---------- */

    public function test_partial_refund_per_item_with_proportional_tax(): void
    {
        $this->actingAsRole('manager'); // modal laci 100000
        $order = $this->posOrder(['pay_later' => false, 'payments' => [['method' => 'cash', 'amount' => 44000, 'tendered' => 44000]]])->json('data');
        $itemId = $order['items'][0]['id'];

        // 1 dari 2 kopi: 20000 + pajak 10% = 22000
        $this->postJson("/api/v1/admin/orders/{$order['id']}/refunds", [
            'items' => [['order_item_id' => $itemId, 'quantity' => 1]],
            'reason' => 'Kopi tumpah',
            'method' => 'cash',
        ])->assertCreated()
            ->assertJsonPath('data.refund.amount', 22000)
            ->assertJsonPath('data.order.payment_status', 'partially_refunded');

        // Tidak bisa refund melebihi sisa
        $this->postJson("/api/v1/admin/orders/{$order['id']}/refunds", [
            'items' => [['order_item_id' => $itemId, 'quantity' => 2]], 'reason' => 'Lagi', 'method' => 'cash',
        ])->assertStatus(422);

        $this->postJson("/api/v1/admin/orders/{$order['id']}/refunds", [
            'items' => [['order_item_id' => $itemId, 'quantity' => 1]], 'reason' => 'Sisa', 'method' => 'cash', 'restock' => true,
        ])->assertCreated()->assertJsonPath('data.order.payment_status', 'refunded');

        // Kas seharusnya: 100000 + 44000 - 44000 refund tunai
        $this->assertSame(100000, $this->getJson('/api/v1/admin/pos/shift')->json('data.summary.expected_cash'));

        // Laporan: pendapatan bersih 0, refund tercatat di laporan pengecualian
        $today = now()->setTimezone('Asia/Jakarta')->toDateString();
        $this->getJson("/api/v1/admin/reports?start_date={$today}&end_date={$today}")->assertJsonPath('summary.net_revenue', 0);
        $this->getJson("/api/v1/admin/reports/exceptions?start_date={$today}&end_date={$today}")
            ->assertOk()
            ->assertJsonPath('data.summary.refunds', 2)
            ->assertJsonPath('data.summary.waste_items', 1); // refund pertama tidak dikembalikan ke stok
    }

    public function test_refund_by_cashier_requires_manager_pin(): void
    {
        $this->staff('manager', ['username' => 'mgr2', 'pin' => '2468']);
        $this->actingAsRole('cashier');
        $order = $this->posOrder(['pay_later' => false, 'payments' => [['method' => 'edc', 'amount' => 44000, 'reference' => 'EDC9']]])->json('data');
        $payload = ['items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 2]], 'reason' => 'Salah pesan', 'method' => 'original'];

        $this->postJson("/api/v1/admin/orders/{$order['id']}/refunds", $payload)->assertStatus(422)->assertJsonValidationErrors('approver_pin');

        $this->postJson("/api/v1/admin/orders/{$order['id']}/refunds", [...$payload, 'approver_username' => 'mgr2', 'approver_pin' => '2468'])
            ->assertCreated()
            ->assertJsonPath('data.refund.method', 'edc')
            ->assertJsonPath('data.refund.amount', 44000);
    }

    /* ---------- Log aktivitas (USR-03) ---------- */

    public function test_audit_log_records_master_data_and_settings_changes(): void
    {
        $owner = $this->actingAsRole('owner');
        $product = $this->product();

        $this->putJson("/api/v1/admin/products/{$product->id}", ['price' => 25000])->assertOk();
        $this->patchJson("/api/v1/admin/products/{$product->id}/availability", ['stock_quantity' => 3])->assertOk();
        $this->putJson('/api/v1/admin/settings', ['tax_rate' => 11])->assertOk();

        $price = AuditLog::where('action', 'product.updated')->latest('id')->first();
        $this->assertSame(['from' => 20000, 'to' => 25000], $price->changes['price']);
        $this->assertSame($owner->id, $price->user_id);
        $this->assertTrue(AuditLog::where('action', 'product.stock_adjusted')->exists());
        $this->assertTrue(AuditLog::where('action', 'settings.updated')->exists());

        // Pemotongan stok karena pesanan pelanggan tidak mengotori log
        $count = AuditLog::count();
        $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]])->assertCreated();
        $this->assertSame($count, AuditLog::count());

        $this->getJson('/api/v1/admin/audit-logs?action=product')->assertOk()->assertJsonPath('data.0.user.name', $owner->name);
    }

    public function test_pin_is_never_written_to_audit_log(): void
    {
        $this->actingAsRole('owner');
        $user = $this->staff('cashier');

        $this->putJson("/api/v1/admin/users/{$user->id}", ['pin' => '9999'])->assertOk();

        $log = AuditLog::where('action', 'user.updated')->latest('id')->first();
        $this->assertStringNotContainsString('9999', json_encode($log->changes));
        $this->assertArrayHasKey('pin_hash', $log->changes);
    }

    /* ---------- Laporan (RPT-03/04) ---------- */

    public function test_product_and_hourly_reports(): void
    {
        $this->actingAsRole('owner');
        $this->posOrder(['pay_later' => false, 'payments' => [['method' => 'cash', 'amount' => 66000, 'tendered' => 66000]]], 3);
        $today = now()->setTimezone('Asia/Jakarta')->toDateString();

        $this->getJson("/api/v1/admin/reports/products?start_date={$today}&end_date={$today}")
            ->assertOk()
            ->assertJsonPath('data.products.0.name', 'Kopi Susu')
            ->assertJsonPath('data.products.0.quantity', 3)
            ->assertJsonPath('data.products.0.revenue', 60000)
            ->assertJsonPath('data.categories.0.name', 'Kopi');

        $hour = now()->setTimezone('Asia/Jakarta')->hour;
        $this->getJson("/api/v1/admin/reports/hourly?start_date={$today}&end_date={$today}")
            ->assertOk()
            ->assertJsonPath("data.hours.{$hour}.count", 1)
            ->assertJsonPath('data.peak_hour', $hour);
    }

    public function test_cashier_cannot_read_audit_logs_or_insight_reports(): void
    {
        $this->actingAsRole('cashier');
        $this->getJson('/api/v1/admin/audit-logs')->assertForbidden();
        $this->getJson('/api/v1/admin/reports/products?start_date=2026-01-01&end_date=2026-01-02')->assertForbidden();
    }
}
