<?php

namespace App\Http\Controllers\Api\Admin;

use App\Exports\OrdersExport;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\SalesReport;
use App\Support\StoreSettings;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        [$start, $end] = $this->range($request);

        $summary = SalesReport::summary($start, $end);

        $orders = Order::with(['items', 'diningTable:id,name'])
            ->whereBetween('created_at', [$start, $end])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'total_revenue' => $summary['net_revenue'],
            'total_orders' => $orders->count(),
            'summary' => $summary,
            'orders' => $orders,
        ]);
    }

    public function exportExcel(Request $request)
    {
        [$start, $end] = $this->range($request);

        $fileName = 'Laporan_Penjualan_' . $request->query('start_date') . '_to_' . $request->query('end_date') . '.xlsx';

        return Excel::download(new OrdersExport($start, $end), $fileName);
    }

    /** Rentang tanggal dalam zona waktu toko, dikonversi ke UTC untuk query. */
    private function range(Request $request): array
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $tz = StoreSettings::get('timezone', 'Asia/Jakarta');
        $appTz = config('app.timezone');

        return [
            CarbonImmutable::parse($request->query('start_date'), $tz)->startOfDay()->setTimezone($appTz),
            CarbonImmutable::parse($request->query('end_date'), $tz)->endOfDay()->setTimezone($appTz),
        ];
    }
}
