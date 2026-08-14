<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use App\Exports\OrdersExport;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        if (!$startDate || !$endDate) {
            return response()->json(['message' => 'start_date and end_date are required'], 400);
        }

        $start = \Carbon\Carbon::parse($startDate)->startOfDay();
        $end = \Carbon\Carbon::parse($endDate)->endOfDay();

        $ordersQuery = Order::with('items')
            ->whereBetween('created_at', [$start, $end])
            ->orderBy('created_at', 'desc');

        $orders = $ordersQuery->get();

        // Calculate totals based on 'completed' status
        $completedOrders = $orders->whereIn('status', ['paid', 'completed', 'selesai']);
        $totalRevenue = $completedOrders->sum('grand_total');
        $totalOrders = $orders->count();

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_orders' => $totalOrders,
            'orders' => $orders,
        ], 200);
    }

    public function exportExcel(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        if (!$startDate || !$endDate) {
            return response()->json(['message' => 'start_date and end_date are required'], 400);
        }

        $fileName = 'Laporan_Penjualan_' . $startDate . '_to_' . $endDate . '.xlsx';

        return Excel::download(new OrdersExport($startDate, $endDate), $fileName);
    }
}
