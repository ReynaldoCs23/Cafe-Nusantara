<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $orderId = $request->input('order_id');
        $transactionStatus = $request->input('transaction_status');

        $order = Order::with('items.product')->where('order_number', $orderId)->first();

        if (!$order) {
            return response()->json([
                'message' => 'Pesanan tidak ditemukan'
            ], 404);
        }

        if (in_array($transactionStatus, ['settlement', 'capture'])) {
            $order->status = 'paid';
        } elseif (in_array($transactionStatus, ['cancel', 'deny', 'expire'])) {
            if ($order->status !== 'cancelled') {
                foreach ($order->items as $item) {
                    if ($item->product) {
                        $item->product->stock_quantity += $item->quantity;
                        $item->product->is_active = true;
                        $item->product->save();
                    }
                }
            }
            $order->status = 'cancelled';
        }

        $order->save();

        return response()->json([
            'message' => 'Webhook processed successfully'
        ], 200);
    }
}
