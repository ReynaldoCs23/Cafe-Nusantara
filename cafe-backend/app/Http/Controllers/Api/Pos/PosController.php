<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\DiningTable;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Services\OrderService;
use App\Support\StoreSettings;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Endpoint layar kasir (PRD POS-01..11).
 */
class PosController extends Controller
{
    public function __construct(private OrderService $orders)
    {
    }

    /** Menu lengkap untuk kasir, termasuk produk habis (ditampilkan abu-abu) dan stok. */
    public function menu()
    {
        return response()->json([
            'data' => [
                'categories' => Category::where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'slug']),
                'products' => Product::with('modifierGroups.modifiers')
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->get(),
                'tables' => DiningTable::where('is_active', true)->orderBy('name')->get(['id', 'name', 'area']),
                'settings' => StoreSettings::all(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1|max:100',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1|max:999',
            'items.*.modifier_ids' => 'nullable|array|max:20',
            'items.*.modifier_ids.*' => 'integer',
            'items.*.notes' => 'nullable|string|max:200',
            'customer_name' => 'required|string|max:100',
            'customer_phone' => 'nullable|string|max:20',
            'notes' => 'nullable|string|max:500',
            'fulfillment' => 'required|in:pickup,table',
            'dining_table_id' => ['nullable', 'required_if:fulfillment,table', Rule::exists('dining_tables', 'id')->where('is_active', true)],
            'pay_later' => 'nullable|boolean',
            'payments' => 'nullable|array|max:5',
            'payments.*.method' => ['required', Rule::in(Payment::STAFF_METHODS)],
            'payments.*.amount' => 'required|integer|min:1',
            'payments.*.tendered' => 'nullable|integer|min:0',
            'payments.*.reference' => 'nullable|string|max:100',
        ]);

        $key = $request->header('Idempotency-Key');

        $order = $this->orders->createPosOrder([
            'fulfillment' => $validated['fulfillment'],
            'dining_table_id' => $validated['fulfillment'] === 'table' ? $validated['dining_table_id'] : null,
            'items' => $validated['items'],
            'customer_name' => trim($validated['customer_name']),
            'customer_phone' => $validated['customer_phone'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'idempotency_key' => is_string($key) && preg_match('/^[A-Za-z0-9\-_]{8,100}$/', $key) ? $key : null,
        ], $validated['payments'] ?? [], $request->user(), (bool) ($validated['pay_later'] ?? false));

        return response()->json([
            'message' => $order->payment_status->value === 'paid' ? 'Pesanan dibayar dan masuk antrean' : 'Pesanan disimpan, belum dibayar',
            'data' => $order,
        ], 201);
    }

    public function voidItem(Request $request, string $id)
    {
        $validated = $request->validate(['reason' => 'required|string|min:3|max:255']);

        $order = $this->orders->voidItem(OrderItem::findOrFail($id), $request->user(), $validated['reason']);

        return response()->json(['message' => 'Item di-void', 'data' => $order]);
    }

    /** Data struk untuk dicetak di printer thermal 58/80 mm (PRD PRN-01). */
    public function receipt(string $id)
    {
        $order = Order::with([
            'items' => fn ($q) => $q->where('status', '!=', 'voided'),
            'payments' => fn ($q) => $q->where('status', 'paid'),
            'payments.receiver:id,name', 'refunds', 'diningTable:id,name', 'creator:id,name',
        ])->find($id);

        if (! $order) {
            throw ValidationException::withMessages(['order' => 'Pesanan tidak ditemukan.']);
        }

        return response()->json([
            'data' => [
                'store' => array_intersect_key(StoreSettings::all(), array_flip([
                    'store_name', 'store_address', 'store_phone', 'receipt_footer', 'tax_rate', 'tax_inclusive', 'service_charge_rate', 'timezone',
                ])),
                'order' => $order,
            ],
        ]);
    }
}
