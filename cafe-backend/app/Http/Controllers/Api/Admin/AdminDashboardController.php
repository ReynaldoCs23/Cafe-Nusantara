<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\SalesReport;
use App\Support\StoreSettings;

class AdminDashboardController extends Controller
{
    public function metrics()
    {
        $appTz = config('app.timezone');
        $today = StoreSettings::now();
        $start = $today->startOfDay()->setTimezone($appTz);
        $end = $today->endOfDay()->setTimezone($appTz);

        $summary = SalesReport::summary($start, $end);

        $activeOrders = Order::whereIn('status', [
            OrderStatus::Queued->value, OrderStatus::Preparing->value, OrderStatus::Ready->value,
        ])->count();

        $awaitingPayment = Order::where('status', OrderStatus::PendingPayment->value)->count();

        $recentOrders = Order::with(['items', 'user:id,name', 'diningTable:id,name'])
            ->whereBetween('created_at', [$start, $end])
            ->orderByDesc('created_at')
            ->take(5)
            ->get();

        return response()->json([
            'data' => [
                'today_revenue' => $summary['net_revenue'],
                'total_revenue' => $summary['net_revenue'],
                'active_orders' => $activeOrders,
                'awaiting_payment' => $awaitingPayment,
                'total_orders_today' => Order::whereBetween('created_at', [$start, $end])->count(),
                'transactions_today' => $summary['transaction_count'],
                'summary' => $summary,
                'recent_orders' => $recentOrders,
            ],
        ]);
    }
}
