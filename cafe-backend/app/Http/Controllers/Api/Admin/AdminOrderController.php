<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\OrderService;
use App\Support\ManagerApproval;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminOrderController extends Controller
{
    public function __construct(private OrderService $orders)
    {
    }

    public function index(Request $request)
    {
        $request->validate([
            'date' => 'nullable|date',
            'status' => 'nullable|string',
            'channel' => ['nullable', Rule::in(Order::CHANNELS)],
            'q' => 'nullable|string|max:100',
        ]);

        $query = Order::with(['items', 'user:id,name', 'diningTable:id,name', 'payments:id,order_id,method,amount,status'])
            ->orderByDesc('created_at');

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }

        if ($request->filled('status')) {
            $statuses = $request->status === 'active'
                ? [OrderStatus::Queued->value, OrderStatus::Preparing->value, OrderStatus::Ready->value]
                : explode(',', $request->status);
            $query->whereIn('status', $statuses);
        }

        if ($request->filled('channel')) {
            $query->where('channel', $request->channel);
        }

        if ($request->filled('q')) {
            $term = $request->q;
            $query->where(function ($q) use ($term) {
                $q->where('order_number', 'like', "%{$term}%")
                    ->orWhere('customer_name', 'like', "%{$term}%")
                    ->orWhere('customer_phone', 'like', "%{$term}%")
                    ->orWhereHas('diningTable', fn ($t) => $t->where('name', 'like', "%{$term}%"));
            });
        }

        return response()->json(['data' => $query->limit(500)->get()]);
    }

    public function show(string $id)
    {
        $order = Order::with([
            'items', 'user:id,name,email', 'diningTable:id,name',
            'payments.receiver:id,name', 'refunds', 'statusLogs.user:id,name', 'creator:id,name',
        ])->find($id);

        if (! $order) {
            return response()->json(['message' => 'Pesanan tidak ditemukan'], 404);
        }

        return response()->json(['data' => $order]);
    }

    /** Kasir menerima pembayaran untuk pesanan yang menunggu pembayaran. */
    public function recordPayment(Request $request, string $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'method' => ['required', Rule::in(Payment::STAFF_METHODS)],
            'amount' => 'nullable|integer|min:1',
            'tendered' => 'nullable|integer|min:0',
            'reference' => 'nullable|string|max:100',
        ]);

        $payment = $this->orders->recordStaffPayment($order, $validated, $request->user());

        return response()->json([
            'message' => 'Pembayaran berhasil dicatat',
            'data' => [
                'payment' => $payment,
                'order' => $order->fresh(['items', 'payments']),
            ],
        ], 201);
    }

    /** Perubahan status maju: preparing, ready, completed (dan buat ulang dengan alasan). */
    public function updateStatus(Request $request, string $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', Rule::in([OrderStatus::Preparing->value, OrderStatus::Ready->value, OrderStatus::Completed->value])],
            'reason' => 'nullable|string|max:255',
        ]);

        $order = $this->orders->transition($order, OrderStatus::from($validated['status']), $request->user(), $validated['reason'] ?? null);

        return response()->json([
            'message' => 'Status pesanan berhasil diperbarui',
            'data' => $order->load('items'),
        ]);
    }

    /** Batal pesanan. Pesanan lunas butuh manager atau PIN manager, dan refund dibuat otomatis. */
    public function cancel(Request $request, string $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'reason' => 'required|string|min:3|max:255',
            'approver_username' => 'nullable|string',
            'approver_pin' => 'nullable|string',
        ]);

        $approver = null;
        if ($order->status !== OrderStatus::PendingPayment) {
            $approver = ManagerApproval::resolve($request, $request->user());
        }

        $order = $this->orders->cancel($order, $request->user(), $validated['reason'], $approver);

        return response()->json([
            'message' => 'Pesanan dibatalkan',
            'data' => $order->load('items', 'refunds'),
        ]);
    }
}
