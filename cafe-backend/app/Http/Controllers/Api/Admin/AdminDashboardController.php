<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

use Carbon\Carbon;

class AdminDashboardController extends Controller
{
    public function metrics()
    {
        $today = Carbon::today();

        // today_revenue: Sum of the grand total for all 'completed' or 'paid' orders today.
        $todayRevenue = Order::whereDate('created_at', $today)
            ->whereIn('status', ['paid', 'completed', 'selesai'])
            ->sum('grand_total');
        
        // active_orders: Count of orders with 'pending' or 'processing' status.
        $activeOrders = Order::whereIn('status', ['pending', 'processing'])->count();
        
        // total_orders_today: Count of orders created today.
        $totalOrdersToday = Order::whereDate('created_at', $today)->count();
        
        // recent_orders: Fetch the 5 most recent orders from today.
        $recentOrders = Order::with(['items', 'user'])
            ->whereDate('created_at', $today)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        return response()->json([
            'data' => [
                'today_revenue' => $todayRevenue, // renamed to match expected today_revenue
                'total_revenue' => $todayRevenue, // keep for backward compatibility
                'active_orders' => $activeOrders,
                'total_orders_today' => $totalOrdersToday,
                'recent_orders' => $recentOrders
            ]
        ], 200);
    }
}
