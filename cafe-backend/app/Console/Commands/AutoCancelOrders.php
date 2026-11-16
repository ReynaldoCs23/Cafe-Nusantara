<?php

namespace App\Console\Commands;

use App\Services\OrderService;
use Illuminate\Console\Command;

/**
 * Membatalkan pesanan BELUM LUNAS yang melewati batas waktu bayar.
 * Pesanan yang sudah dibayar tidak pernah disentuh (PRD bagian 7).
 */
class AutoCancelOrders extends Command
{
    protected $signature = 'orders:auto-cancel';

    protected $description = 'Batalkan pesanan belum lunas yang sudah lewat batas waktu pembayaran';

    public function handle(OrderService $orders): int
    {
        $count = $orders->expireUnpaidOrders();

        $this->info("{$count} pesanan belum lunas dibatalkan.");

        return self::SUCCESS;
    }
}
