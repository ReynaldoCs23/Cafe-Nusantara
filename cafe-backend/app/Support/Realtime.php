<?php

namespace App\Support;

use App\Events\OrderStatusUpdated;
use App\Events\OrderTracking;
use Illuminate\Support\Facades\DB;

/**
 * Mengirim event realtime SETELAH transaksi database tersimpan, dan tidak pernah
 * menggagalkan transaksi kasir jika server Reverb sedang mati (cukup dicatat di log).
 * Layar staf & halaman status pelanggan tetap punya polling cadangan.
 */
class Realtime
{
    public static function dispatch(object $event): void
    {
        DB::afterCommit(function () use ($event) {
            rescue(fn () => event($event), report: true);

            // Setiap perubahan status juga dikabarkan ke halaman pelacak milik pelanggan
            if ($event instanceof OrderStatusUpdated && $event->order->access_token) {
                rescue(fn () => event(new OrderTracking($event->order)), report: true);
            }
        });
    }
}
