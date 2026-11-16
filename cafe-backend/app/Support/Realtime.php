<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Mengirim event realtime SETELAH transaksi database tersimpan, dan tidak pernah
 * menggagalkan transaksi kasir jika server Reverb sedang mati (cukup dicatat di log).
 * Layar staf tetap punya polling cadangan.
 */
class Realtime
{
    public static function dispatch(object $event): void
    {
        DB::afterCommit(function () use ($event) {
            rescue(fn () => event($event), report: true);
        });
    }
}
