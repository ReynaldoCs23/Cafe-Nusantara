<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiningTable;
use App\Models\Order;
use App\Services\OrderService;
use App\Support\StoreSettings;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Pesanan dari pelanggan: QR meja (channel qr) dan website (channel online).
 */
class OrderController extends Controller
{
    public function __construct(private OrderService $orders)
    {
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1|max:50',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1|max:99',
            'items.*.modifier_ids' => 'nullable|array|max:20',
            'items.*.modifier_ids.*' => 'integer',
            'items.*.notes' => 'nullable|string|max:200',
            'customer_name' => 'required|string|max:100',
            'customer_phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s]{8,20}$/'],
            'notes' => 'nullable|string|max:500',
            'table_token' => 'nullable|string|max:64',
            'fulfillment' => 'nullable|in:pickup,table',
            'voucher_code' => 'nullable|string|max:40',
            'redeem_points' => 'nullable|integer|min:0',
        ]);

        if (! StoreSettings::isOpen()) {
            throw ValidationException::withMessages(['store' => 'Maaf, toko sedang tutup dan belum menerima pesanan.']);
        }

        if (! StoreSettings::get('pay_at_cashier_enabled') && ! StoreSettings::get('online_payment_enabled')) {
            throw ValidationException::withMessages(['store' => 'Pemesanan mandiri sedang dinonaktifkan. Silakan pesan di kasir.']);
        }

        $limit = (int) StoreSettings::get('max_orders_per_hour');
        if ($limit > 0) {
            $lastHour = Order::whereIn('channel', ['qr', 'online'])->where('created_at', '>=', now()->subHour())->count();
            if ($lastHour >= $limit) {
                throw ValidationException::withMessages(['store' => 'Pesanan sedang sangat ramai. Silakan coba beberapa menit lagi atau pesan di kasir.']);
            }
        }

        $table = null;
        if (! empty($validated['table_token'])) {
            $table = DiningTable::where('qr_token', $validated['table_token'])->where('is_active', true)->first();
            if (! $table) {
                throw ValidationException::withMessages(['table_token' => 'QR meja tidak valid atau meja sedang tidak aktif.']);
            }
        }

        $fulfillment = $table ? ($validated['fulfillment'] ?? 'table') : 'pickup';
        $user = $request->user('sanctum');

        $order = $this->orders->create([
            'channel' => $table ? 'qr' : 'online',
            'fulfillment' => $fulfillment,
            'dining_table_id' => $fulfillment === 'table' ? $table?->id : null,
            'items' => $validated['items'],
            'customer_name' => trim($validated['customer_name']),
            'customer_phone' => $validated['customer_phone'] ?? $user?->phone_number,
            'notes' => $validated['notes'] ?? null,
            'user_id' => $user?->id,
            'voucher_code' => $validated['voucher_code'] ?? null,
            'redeem_points' => $user ? ($validated['redeem_points'] ?? 0) : 0,
            'idempotency_key' => $this->idempotencyKey($request),
            'payment_due_at' => now()->addMinutes((int) StoreSettings::get('qr_payment_timeout_minutes')),
        ]);

        $order->load('items', 'diningTable:id,name');

        return response()->json([
            'message' => 'Pesanan berhasil dibuat. Silakan lakukan pembayaran di kasir.',
            'data' => $order,
            'access_token' => $order->access_token,
        ], 201);
    }

    /**
     * Status pesanan untuk pelanggan. Wajib token akses (bukan hanya nomor pesanan).
     */
    public function show(Request $request, string $orderNumber)
    {
        $order = Order::with(['items', 'diningTable:id,name'])
            ->where('order_number', $orderNumber)
            ->first();

        $user = $request->user('sanctum');
        $token = (string) $request->query('token', '');
        $authorized = $order && (
            ($token !== '' && hash_equals($order->access_token, $token))
            || ($user && $order->user_id === $user->id)
            || ($user && $user->isStaff())
        );

        if (! $authorized) {
            return response()->json(['message' => 'Pesanan tidak ditemukan'], 404);
        }

        return response()->json([
            'data' => $order,
        ]);
    }

    public function myOrders(Request $request)
    {
        $orders = Order::with(['items.product:id,image_path', 'diningTable:id,name'])
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->each(fn (Order $order) => $order->makeVisible('access_token'));

        return response()->json(['data' => $orders]);
    }

    private function idempotencyKey(Request $request): ?string
    {
        $key = $request->header('Idempotency-Key');

        return is_string($key) && preg_match('/^[A-Za-z0-9\-_]{8,100}$/', $key) ? $key : null;
    }
}
