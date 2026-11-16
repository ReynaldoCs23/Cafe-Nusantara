<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiningTable;
use App\Support\StoreSettings;

class StoreController extends Controller
{
    public function status()
    {
        return response()->json([
            'data' => [
                ...StoreSettings::publicSettings(),
                'is_open' => StoreSettings::isOpen(),
                'server_time' => StoreSettings::now()->toIso8601String(),
            ],
        ]);
    }

    /** Validasi QR meja untuk halaman pemesanan. */
    public function table(string $token)
    {
        $table = DiningTable::where('qr_token', $token)->where('is_active', true)->first();

        if (! $table) {
            return response()->json(['message' => 'QR meja tidak valid atau meja sedang tidak aktif.'], 404);
        }

        return response()->json(['data' => $table->only(['id', 'name', 'area'])]);
    }
}
