<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Events\OrderStatusUpdated;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    public function index()
    {
        $orders = Order::with(['items.product', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $orders
        ], 200);
    }

    public function show($id)
    {
        $order = Order::with(['items.product', 'user'])->find($id);

        if (!$order) {
            return response()->json([
                'message' => 'Pesanan tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'data' => $order
        ], 200);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,paid,processing,completed,cancelled'
        ]);

        $order = Order::with('items.product')->find($id);

        if (!$order) {
            return response()->json([
                'message' => 'Pesanan tidak ditemukan'
            ], 404);
        }

        if ($order->status !== 'cancelled' && $request->status === 'cancelled') {
            foreach ($order->items as $item) {
                if ($item->product) {
                    $item->product->stock_quantity += $item->quantity;
                    $item->product->is_active = true;
                    $item->product->save();
                }
            }
        }

        $order->status = $request->status;
        $order->save();

        // Dispatch real-time event
        event(new OrderStatusUpdated($order));

        return response()->json([
            'message' => 'Status pesanan berhasil diperbarui',
            'data' => $order
        ], 200);
    }

    public function syncToMoka(Request $request, $id)
    {
        $order = Order::with(['items.product', 'user'])->find($id);

        if (!$order) {
            return response()->json([
                'message' => 'Pesanan tidak ditemukan'
            ], 404);
        }

        if ($order->status !== 'paid') {
            return response()->json([
                'message' => 'Hanya pesanan yang sudah dibayar yang dapat disinkronkan'
            ], 400);
        }

        if ($order->moka_transaction_id) {
            return response()->json([
                'message' => 'Pesanan ini sudah disinkronkan ke Moka POS'
            ], 400);
        }

        // Simulate External API Call to Moka POS
        $mockResponse = [
            'id' => 'MOKA-' . rand(10000, 99999),
            'status' => 'success'
        ];

        $order->moka_transaction_id = $mockResponse['id'];
        $order->save();

        return response()->json([
            'message' => 'Pesanan berhasil disinkronkan ke Moka POS',
            'data' => $order
        ], 200);
    }
}
