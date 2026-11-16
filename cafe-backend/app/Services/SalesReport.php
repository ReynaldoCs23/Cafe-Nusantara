<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use Carbon\CarbonInterface;

/**
 * Pendapatan dihitung dari pembayaran lunas dikurangi refund (PRD RPT-07),
 * bukan dari status pesanan.
 */
class SalesReport
{
    public static function summary(CarbonInterface $start, CarbonInterface $end): array
    {
        $payments = Payment::where('status', 'paid')->whereBetween('paid_at', [$start, $end]);
        $refunds = Refund::whereBetween('created_at', [$start, $end]);

        $paidTotal = (int) (clone $payments)->sum('amount');
        $refundTotal = (int) (clone $refunds)->sum('amount');

        $paidOrders = Order::whereNotNull('paid_at')
            ->whereBetween('paid_at', [$start, $end])
            ->where('payment_status', '!=', 'unpaid');

        $transactionCount = (clone $paidOrders)->whereIn('payment_status', ['paid', 'partially_refunded'])->count();

        $byMethod = (clone $payments)
            ->selectRaw('method, COUNT(*) as count, SUM(amount) as amount')
            ->groupBy('method')
            ->get()
            ->map(fn ($row) => ['method' => $row->method, 'count' => (int) $row->count, 'amount' => (int) $row->amount])
            ->values();

        $byChannel = (clone $paidOrders)
            ->whereIn('payment_status', ['paid', 'partially_refunded'])
            ->selectRaw('channel, COUNT(*) as count, SUM(grand_total) as amount')
            ->groupBy('channel')
            ->get()
            ->map(fn ($row) => ['channel' => $row->channel, 'count' => (int) $row->count, 'amount' => (int) $row->amount])
            ->values();

        $components = (clone $paidOrders)
            ->whereIn('payment_status', ['paid', 'partially_refunded'])
            ->selectRaw('COALESCE(SUM(subtotal),0) as gross, COALESCE(SUM(discount_total),0) as discount, COALESCE(SUM(service_charge),0) as service, COALESCE(SUM(tax_amount),0) as tax, COALESCE(SUM(rounding),0) as rounding')
            ->first();

        $net = $paidTotal - $refundTotal;

        return [
            'gross_sales' => (int) $components->gross,
            'discount_total' => (int) $components->discount,
            'service_charge' => (int) $components->service,
            'tax_amount' => (int) $components->tax,
            'rounding' => (int) $components->rounding,
            'payments_total' => $paidTotal,
            'refunds_total' => $refundTotal,
            'net_revenue' => $net,
            'transaction_count' => $transactionCount,
            'average_ticket' => $transactionCount > 0 ? (int) round($net / $transactionCount) : 0,
            'by_method' => $byMethod,
            'by_channel' => $byChannel,
        ];
    }
}
