<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusLog;
use App\Models\Refund;
use App\Support\StoreSettings;
use Carbon\CarbonInterface;

/**
 * Laporan analitik Fase 4: produk terlaris (RPT-03), penjualan per jam (RPT-04),
 * serta pembatalan, refund, void, dan buat ulang (RPT-05, RFD-04).
 */
class InsightReport
{
    private const PAID = ['paid', 'partially_refunded'];

    public static function products(CarbonInterface $start, CarbonInterface $end): array
    {
        $rows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->whereBetween('orders.paid_at', [$start, $end])
            ->whereIn('orders.payment_status', self::PAID)
            ->where('order_items.status', '!=', 'voided')
            ->selectRaw('order_items.product_name as name, categories.name as category')
            ->selectRaw('SUM(order_items.quantity - order_items.refunded_quantity) as quantity')
            ->selectRaw('SUM((order_items.quantity - order_items.refunded_quantity) * (order_items.unit_price + order_items.modifiers_total)) as revenue')
            ->selectRaw('COUNT(DISTINCT orders.id) as orders')
            ->groupBy('order_items.product_name', 'categories.name')
            ->get()
            ->map(fn ($r) => [
                'name' => $r->name,
                'category' => $r->category ?? 'Lainnya',
                'quantity' => (int) $r->quantity,
                'revenue' => (int) $r->revenue,
                'orders' => (int) $r->orders,
            ])
            ->filter(fn ($r) => $r['quantity'] > 0)
            ->sortByDesc('quantity')
            ->values();

        $categories = $rows->groupBy('category')
            ->map(fn ($items, $name) => [
                'name' => $name,
                'quantity' => $items->sum('quantity'),
                'revenue' => $items->sum('revenue'),
            ])
            ->sortByDesc('revenue')
            ->values();

        return [
            'products' => $rows,
            'categories' => $categories,
            'total_quantity' => $rows->sum('quantity'),
            'total_revenue' => $rows->sum('revenue'),
        ];
    }

    /** Penjualan per jam & per hari dalam zona waktu toko (untuk atur jumlah staf). */
    public static function hourly(CarbonInterface $start, CarbonInterface $end): array
    {
        $tz = StoreSettings::get('timezone', 'Asia/Jakarta');
        $hours = array_fill(0, 24, ['count' => 0, 'amount' => 0]);
        $weekdays = array_fill(1, 7, ['count' => 0, 'amount' => 0]);

        Order::whereBetween('paid_at', [$start, $end])
            ->whereIn('payment_status', self::PAID)
            ->select(['paid_at', 'grand_total'])
            ->orderBy('paid_at')
            ->chunk(1000, function ($orders) use (&$hours, &$weekdays, $tz) {
                foreach ($orders as $order) {
                    $local = $order->paid_at->copy()->setTimezone($tz);
                    $hours[$local->hour]['count']++;
                    $hours[$local->hour]['amount'] += $order->grand_total;
                    $weekdays[$local->dayOfWeekIso]['count']++;
                    $weekdays[$local->dayOfWeekIso]['amount'] += $order->grand_total;
                }
            });

        $names = [1 => 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        $days = max(1, (int) $start->diffInDays($end) + 1);

        return [
            'hours' => collect($hours)->map(fn ($v, $h) => ['hour' => $h, ...$v, 'avg_per_day' => round($v['count'] / $days, 1)])->values(),
            'weekdays' => collect($weekdays)->map(fn ($v, $d) => ['day' => $names[$d], ...$v])->values(),
            'days' => $days,
            'peak_hour' => collect($hours)->sortByDesc('count')->keys()->first(),
        ];
    }

    /** Pembatalan, refund, void, dan buat ulang beserta alasan dan pelakunya. */
    public static function exceptions(CarbonInterface $start, CarbonInterface $end): array
    {
        $cancellations = Order::with(['statusLogs' => fn ($q) => $q->where('to', 'cancelled')->with('user:id,name')])
            ->where('status', 'cancelled')
            ->whereBetween('cancelled_at', [$start, $end])
            ->orderByDesc('cancelled_at')
            ->get()
            ->map(fn (Order $o) => [
                'order_id' => $o->id,
                'order_number' => $o->order_number,
                'queue_number' => $o->queue_number,
                'customer_name' => $o->customer_name,
                'amount' => $o->grand_total,
                'was_paid' => $o->payment_status->value !== 'unpaid',
                'reason' => $o->cancel_reason,
                'by' => $o->statusLogs->first()?->user?->name ?? 'Sistem',
                'at' => $o->cancelled_at,
            ]);

        $refunds = Refund::with(['order:id,order_number,queue_number,customer_name', 'approver:id,name', 'creator:id,name'])
            ->whereBetween('created_at', [$start, $end])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Refund $r) => [
                'order_number' => $r->order?->order_number,
                'queue_number' => $r->order?->queue_number,
                'amount' => $r->amount,
                'method' => $r->method,
                'items' => $r->items,
                'restocked' => $r->restocked,
                'reason' => $r->reason,
                'by' => $r->creator?->name ?? 'Sistem',
                'approved_by' => $r->approver?->name,
                'at' => $r->created_at,
            ]);

        $voids = OrderItem::with(['order:id,order_number,queue_number,status', 'voider:id,name'])
            ->whereBetween('voided_at', [$start, $end])
            ->orderByDesc('voided_at')
            ->get()
            ->map(fn (OrderItem $i) => [
                'order_number' => $i->order?->order_number,
                'queue_number' => $i->order?->queue_number,
                'product_name' => $i->product_name,
                'quantity' => $i->quantity,
                'value' => $i->line_total,
                'already_made' => $i->started_at !== null,
                'reason' => $i->void_reason,
                'by' => $i->voider?->name ?? 'Sistem',
                'at' => $i->voided_at,
            ]);

        $remakes = OrderStatusLog::with(['user:id,name', 'order:id,order_number,queue_number'])
            ->where('from', 'ready')
            ->where('to', 'preparing')
            ->whereBetween('created_at', [$start, $end])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (OrderStatusLog $l) => [
                'order_number' => $l->order?->order_number,
                'queue_number' => $l->order?->queue_number,
                'reason' => $l->reason,
                'by' => $l->user?->name ?? 'Sistem',
                'at' => $l->created_at,
            ]);

        // Perkiraan bahan terbuang: item sudah dibuat lalu di-void/batal, dan refund yang tidak dikembalikan ke stok
        $wastedFromVoids = $voids->where('already_made', true);
        $wastedFromRefunds = $refunds->where('restocked', false);

        return [
            'summary' => [
                'cancellations' => $cancellations->count(),
                'cancelled_paid_value' => $cancellations->where('was_paid', true)->sum('amount'),
                'refunds' => $refunds->count(),
                'refunds_value' => $refunds->sum('amount'),
                'voids' => $voids->count(),
                'remakes' => $remakes->count(),
                'waste_items' => $wastedFromVoids->sum('quantity')
                    + $wastedFromRefunds->sum(fn ($r) => collect($r['items'] ?? [])->sum('quantity')),
                'waste_value' => $wastedFromVoids->sum('value')
                    + $wastedFromRefunds->sum(fn ($r) => collect($r['items'] ?? [])->sum(fn ($i) => $i['quantity'] * $i['unit_price'])),
            ],
            'cancellations' => $cancellations->values(),
            'refunds' => $refunds->values(),
            'voids' => $voids->values(),
            'remakes' => $remakes->values(),
        ];
    }
}
