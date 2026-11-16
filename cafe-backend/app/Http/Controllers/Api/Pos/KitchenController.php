<?php

namespace App\Http\Controllers\Api\Pos;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use App\Support\StoreSettings;
use Illuminate\Http\Request;

/**
 * Layar bar/dapur (KDS), daftar antar pelayan, dan papan antrean publik.
 */
class KitchenController extends Controller
{
    public function __construct(private OrderService $orders)
    {
    }

    /** Antrean aktif per stasiun, paling lama di depan (PRD KDS-01..04). */
    public function queue(Request $request)
    {
        $request->validate(['station' => 'nullable|in:bar,kitchen,all']);
        $station = $request->query('station', 'all');

        $orders = Order::with([
            'items' => fn ($q) => $q->where('status', '!=', 'voided')
                ->when($station !== 'all', fn ($q) => $q->where('station', $station))
                ->orderBy('id'),
            'diningTable:id,name',
        ])
            ->whereIn('status', [OrderStatus::Queued->value, OrderStatus::Preparing->value])
            ->when($station !== 'all', fn ($q) => $q->whereHas('items', fn ($i) => $i->where('station', $station)
                ->whereIn('status', ['queued', 'preparing'])))
            ->orderBy('paid_at')
            ->orderBy('created_at')
            ->get();

        // Pesanan yang baru saja siap (15 menit terakhir) untuk dibatalkan bila salah tekan
        $recentReady = Order::with(['items' => fn ($q) => $q->where('status', '!=', 'voided')
            ->when($station !== 'all', fn ($q) => $q->where('station', $station)), 'diningTable:id,name'])
            ->where('status', OrderStatus::Ready->value)
            ->where('ready_at', '>=', now()->subMinutes(15))
            ->orderByDesc('ready_at')
            ->limit(12)
            ->get();

        return response()->json([
            'data' => [
                'orders' => $orders,
                'recent_ready' => $recentReady,
                'settings' => [
                    'warning_minutes' => (int) StoreSettings::get('kds_warning_minutes'),
                    'critical_minutes' => (int) StoreSettings::get('kds_critical_minutes'),
                ],
                'server_time' => now()->toIso8601String(),
            ],
        ]);
    }

    /** Ubah status satu/lebih item: queued (urungkan), preparing, ready. */
    public function updateItems(Request $request, string $orderId)
    {
        $validated = $request->validate([
            'item_ids' => 'required|array|min:1',
            'item_ids.*' => 'integer',
            'status' => 'required|in:queued,preparing,ready',
        ]);

        $order = $this->orders->setItemsStatus(Order::findOrFail($orderId), $validated['item_ids'], $validated['status'], $request->user());

        return response()->json(['data' => $order->load('items', 'diningTable:id,name')]);
    }

    /** Pesanan siap yang harus diserahkan: diantar ke meja atau diambil di kasir (PRD WTR-01). */
    public function handoff(Request $request)
    {
        $request->validate(['fulfillment' => 'nullable|in:pickup,table']);

        $orders = Order::with(['items' => fn ($q) => $q->where('status', '!=', 'voided'), 'diningTable:id,name'])
            ->where('status', OrderStatus::Ready->value)
            ->when($request->filled('fulfillment'), fn ($q) => $q->where('fulfillment', $request->fulfillment))
            ->orderBy('ready_at')
            ->get();

        return response()->json([
            'data' => [
                'orders' => $orders,
                'overdue_minutes' => (int) StoreSettings::get('ready_overdue_minutes'),
                'server_time' => now()->toIso8601String(),
            ],
        ]);
    }

    /** Papan antrean publik (TV): hanya nomor antrean, tanpa data pribadi (PRD KDS-07). */
    public function readyBoard()
    {
        $today = StoreSettings::now()->startOfDay()->setTimezone(config('app.timezone'));

        $base = Order::where('created_at', '>=', $today)->where('fulfillment', 'pickup');

        return response()->json([
            'data' => [
                'preparing' => (clone $base)->whereIn('status', [OrderStatus::Queued->value, OrderStatus::Preparing->value])
                    ->orderBy('paid_at')->pluck('queue_number'),
                'ready' => (clone $base)->where('status', OrderStatus::Ready->value)
                    ->orderByDesc('ready_at')->pluck('queue_number'),
                'store_name' => StoreSettings::get('store_name'),
            ],
        ]);
    }
}
