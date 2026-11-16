<?php

namespace App\Exports;

use App\Models\Order;
use App\Support\StoreSettings;
use Carbon\CarbonInterface;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Ekspor transaksi yang dibayar dalam rentang tanggal (berdasarkan waktu lunas).
 */
class OrdersExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    private const CHANNEL_LABELS = ['pos' => 'Kasir', 'qr' => 'QR Meja', 'online' => 'Online'];

    public function __construct(private CarbonInterface $start, private CarbonInterface $end)
    {
    }

    public function collection()
    {
        return Order::with(['items', 'payments', 'refunds', 'diningTable:id,name'])
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$this->start, $this->end])
            ->orderByDesc('paid_at')
            ->get();
    }

    public function headings(): array
    {
        return [
            'No. Pesanan', 'Waktu Lunas', 'Kanal', 'Pelanggan', 'Meja', 'Jumlah Item',
            'Subtotal', 'Diskon', 'Service', 'Pajak', 'Pembulatan', 'Total',
            'Metode Bayar', 'Refund', 'Status Pesanan', 'Status Bayar',
        ];
    }

    public function map($order): array
    {
        $tz = StoreSettings::get('timezone', 'Asia/Jakarta');

        return [
            $order->order_number,
            $order->paid_at?->setTimezone($tz)->format('d/m/Y H:i'),
            self::CHANNEL_LABELS[$order->channel] ?? $order->channel,
            $order->customer_name ?? 'Tamu',
            $order->diningTable?->name ?? '-',
            $order->items->where('status', '!=', 'voided')->sum('quantity'),
            $order->subtotal,
            $order->discount_total,
            $order->service_charge,
            $order->tax_amount,
            $order->rounding,
            $order->grand_total,
            $order->payments->where('status', 'paid')->pluck('method')->unique()->implode(', '),
            $order->refunds->sum('amount'),
            $order->status->label(),
            $order->payment_status->value,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [1 => ['font' => ['bold' => true]]];
    }
}
