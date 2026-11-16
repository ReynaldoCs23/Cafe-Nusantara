<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Penghitung harian yang aman dipakai bersamaan (misalnya nomor antrean).
 * Harus dipanggil di dalam transaksi database.
 */
class DailyCounter
{
    public static function next(string $name): int
    {
        $date = StoreSettings::now()->toDateString();

        DB::table('daily_counters')->insertOrIgnore([
            'date' => $date,
            'name' => $name,
            'value' => 0,
        ]);

        $row = DB::table('daily_counters')
            ->where('date', $date)
            ->where('name', $name)
            ->lockForUpdate()
            ->first();

        $next = $row->value + 1;

        DB::table('daily_counters')->where('id', $row->id)->update(['value' => $next]);

        return $next;
    }
}
