<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use App\Services\Payments\MidtransGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Notifikasi server-to-server dari Midtrans.
 * Urutan pengaman: signature -> cek ulang ke API -> cocokkan nominal -> idempoten.
 */
class PaymentWebhookController extends Controller
{
    public function __construct(private MidtransGateway $gateway, private OrderService $orders)
    {
    }

    public function midtrans(Request $request)
    {
        if (! $this->gateway->isConfigured()) {
            return response()->json(['message' => 'Payment gateway belum dikonfigurasi'], 503);
        }

        $payload = $request->all();

        if (! $this->gateway->verifySignature($payload)) {
            Log::warning('Webhook Midtrans dengan signature tidak valid', ['ip' => $request->ip(), 'order_id' => $payload['order_id'] ?? null]);

            return response()->json(['message' => 'Signature tidak valid'], 403);
        }

        $orderId = (string) $payload['order_id'];

        if ($this->gateway->shouldVerifyWithApi()) {
            $status = $this->gateway->fetchStatus($orderId);
            if (! $status) {
                // Biarkan Midtrans mengirim ulang notifikasi nanti
                return response()->json(['message' => 'Gagal memverifikasi status ke gateway'], 502);
            }
            $payload = array_merge($payload, array_intersect_key($status, array_flip([
                'transaction_status', 'transaction_id', 'gross_amount', 'fraud_status', 'payment_type',
            ])));
        }

        $order = Order::where('order_number', $orderId)->first();
        if (! $order) {
            return response()->json(['message' => 'Pesanan tidak ditemukan'], 404);
        }

        $transactionStatus = $payload['transaction_status'] ?? null;
        $fraudStatus = $payload['fraud_status'] ?? 'accept';
        $amount = (int) round((float) ($payload['gross_amount'] ?? 0));

        $isPaid = $transactionStatus === 'settlement'
            || ($transactionStatus === 'capture' && $fraudStatus === 'accept');

        if ($isPaid) {
            if ($amount !== $order->grand_total) {
                Log::error('Nominal pembayaran gateway tidak sesuai', [
                    'order' => $order->order_number, 'expected' => $order->grand_total, 'received' => $amount,
                ]);

                return response()->json(['message' => 'Nominal tidak sesuai'], 422);
            }

            $this->orders->applyGatewayPayment($order, 'midtrans', (string) $payload['transaction_id'], $amount, $payload);
        } elseif (in_array($transactionStatus, ['deny', 'cancel', 'expire', 'failure'], true)) {
            if ($order->status === OrderStatus::PendingPayment) {
                try {
                    $this->orders->cancel($order, null, "Pembayaran gateway: {$transactionStatus}");
                } catch (ValidationException) {
                    // sudah berubah status, abaikan
                }
            }
        }

        return response()->json(['message' => 'Webhook processed successfully']);
    }
}
