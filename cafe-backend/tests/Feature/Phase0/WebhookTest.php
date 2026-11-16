<?php

namespace Tests\Feature\Phase0;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\Http;

class WebhookTest extends Phase0TestCase
{
    private const SERVER_KEY = 'SB-Mid-server-TEST';

    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.midtrans.server_key' => self::SERVER_KEY, 'services.midtrans.verify_with_api' => true]);

        $product = $this->product();
        $id = $this->placeOrder([['product_id' => $product->id, 'quantity' => 1]])->json('data.id');
        $this->order = Order::findOrFail($id); // total 22000
    }

    private function payload(array $overrides = []): array
    {
        $payload = array_merge([
            'order_id' => $this->order->order_number,
            'status_code' => '200',
            'gross_amount' => '22000.00',
            'transaction_status' => 'settlement',
            'transaction_id' => 'trx-001',
            'payment_type' => 'qris',
        ], $overrides);

        $payload['signature_key'] ??= hash('sha512', $payload['order_id'] . $payload['status_code'] . $payload['gross_amount'] . self::SERVER_KEY);

        return $payload;
    }

    private function fakeGatewayStatus(array $status): void
    {
        Http::fake(['*/v2/*/status' => Http::response($status)]);
    }

    public function test_webhook_with_invalid_signature_is_rejected_and_order_unchanged(): void
    {
        $this->postJson('/api/v1/payment/webhook/midtrans', $this->payload(['signature_key' => 'palsu']))
            ->assertForbidden();

        $this->assertSame('pending_payment', $this->order->fresh()->status->value);
        $this->assertSame(0, Payment::count());
    }

    public function test_forged_request_from_old_endpoint_is_rejected(): void
    {
        // Celah lama: cukup kirim order_id + settlement untuk menandai lunas
        $this->postJson('/api/v1/payment/webhook', [
            'order_id' => $this->order->order_number,
            'transaction_status' => 'settlement',
        ])->assertForbidden();

        $this->assertSame('unpaid', $this->order->fresh()->payment_status->value);
    }

    public function test_valid_settlement_marks_order_paid_once(): void
    {
        $this->fakeGatewayStatus(['transaction_status' => 'settlement', 'transaction_id' => 'trx-001', 'gross_amount' => '22000.00']);

        $this->postJson('/api/v1/payment/webhook/midtrans', $this->payload())->assertOk();
        $this->postJson('/api/v1/payment/webhook/midtrans', $this->payload())->assertOk(); // notifikasi ganda

        $order = $this->order->fresh();
        $this->assertSame('queued', $order->status->value);
        $this->assertSame('paid', $order->payment_status->value);
        $this->assertSame(1, Payment::count());
    }

    public function test_gateway_api_status_wins_over_notification_body(): void
    {
        // Notifikasi bilang settlement, tapi API gateway bilang masih pending
        $this->fakeGatewayStatus(['transaction_status' => 'pending', 'transaction_id' => 'trx-001', 'gross_amount' => '22000.00']);

        $this->postJson('/api/v1/payment/webhook/midtrans', $this->payload())->assertOk();

        $this->assertSame('unpaid', $this->order->fresh()->payment_status->value);
    }

    public function test_amount_mismatch_is_rejected(): void
    {
        $this->fakeGatewayStatus(['transaction_status' => 'settlement', 'transaction_id' => 'trx-001', 'gross_amount' => '1000.00']);

        $this->postJson('/api/v1/payment/webhook/midtrans', $this->payload(['gross_amount' => '1000.00']))
            ->assertStatus(422);

        $this->assertSame('unpaid', $this->order->fresh()->payment_status->value);
    }

    public function test_webhook_is_disabled_when_gateway_not_configured(): void
    {
        config(['services.midtrans.server_key' => null]);

        $this->postJson('/api/v1/payment/webhook/midtrans', $this->payload())->assertStatus(503);
    }
}
