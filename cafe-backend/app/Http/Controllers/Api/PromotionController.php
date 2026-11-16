<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiningTable;
use App\Models\LoyaltyTransaction;
use App\Models\Promotion;
use App\Services\LoyaltyService;
use App\Services\OrderService;
use App\Support\StoreSettings;
use Illuminate\Http\Request;

/**
 * Promo & poin untuk pelanggan.
 */
class PromotionController extends Controller
{
    /** Promo otomatis yang berlaku hari ini (voucher tidak ditampilkan). */
    public function index()
    {
        $today = StoreSettings::now();
        $day = StoreSettings::DAYS[$today->dayOfWeekIso - 1];

        $promotions = Promotion::whereNull('code')
            ->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_on')->orWhere('starts_on', '<=', $today->toDateString()))
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhere('ends_on', '>=', $today->toDateString()))
            ->get()
            ->filter(fn (Promotion $p) => (! $p->days || in_array($day, $p->days, true)) && ($p->quota === null || $p->used_count < $p->quota))
            ->map(fn (Promotion $p) => $p->only([
                'id', 'name', 'description', 'summary', 'type', 'scope', 'scope_ids', 'min_subtotal', 'channels', 'start_time', 'end_time', 'ends_on',
            ]))
            ->values();

        return response()->json(['data' => $promotions]);
    }

    /** Perkiraan total keranjang: promo, voucher, dan tukar poin (tidak memotong stok/poin). */
    public function quote(Request $request, OrderService $orders)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1|max:50',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1|max:99',
            'items.*.modifier_ids' => 'nullable|array|max:20',
            'items.*.modifier_ids.*' => 'integer',
            'voucher_code' => 'nullable|string|max:40',
            'redeem_points' => 'nullable|integer|min:0',
            'table_token' => 'nullable|string|max:64',
        ]);

        $user = $request->user('sanctum');
        $channel = ! empty($validated['table_token']) && DiningTable::where('qr_token', $validated['table_token'])->exists() ? 'qr' : 'online';

        return response()->json(['data' => $orders->quote([
            ...$validated,
            'channel' => $channel,
            'user_id' => $user?->id,
        ])]);
    }

    /** Saldo & riwayat poin pelanggan yang login. */
    public function myLoyalty(Request $request, LoyaltyService $loyalty)
    {
        $user = $request->user();

        return response()->json(['data' => [
            'enabled' => $loyalty->enabled(),
            'points' => $user->loyalty_points,
            'settings' => array_intersect_key(StoreSettings::all(), array_flip([
                'loyalty_earn_amount', 'loyalty_point_value', 'loyalty_min_redeem', 'loyalty_max_redeem_percent',
            ])),
            'transactions' => LoyaltyTransaction::with('order:id,order_number,queue_number')
                ->where('user_id', $user->id)
                ->latest('id')
                ->limit(50)
                ->get(),
        ]]);
    }
}
