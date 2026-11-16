<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusLog;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Refund;
use App\Models\Shift;
use App\Models\User;
use App\Support\DailyCounter;
use App\Support\Realtime;
use App\Support\StoreSettings;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Satu-satunya tempat yang boleh membuat pesanan, menerima pembayaran,
 * mengubah status, dan membatalkan pesanan. Semua aturan PRD bagian 7 ada di sini.
 */
class OrderService
{
    /**
     * @param  array{
     *     channel: string, fulfillment: string, items: array,
     *     customer_name: string, customer_phone?: ?string, notes?: ?string,
     *     dining_table_id?: ?int, user_id?: ?int, created_by?: ?int,
     *     idempotency_key?: ?string, payment_due_at?: mixed, pickup_at?: mixed
     * }  $data
     */
    public function create(array $data): Order
    {
        if (! empty($data['idempotency_key'])) {
            $existing = Order::where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing) {
                return $existing;
            }
        }

        try {
            $order = $this->createInTransaction($data);
        } catch (UniqueConstraintViolationException $e) {
            // Permintaan ganda dengan Idempotency-Key yang sama datang bersamaan
            if (! empty($data['idempotency_key'])) {
                $existing = Order::where('idempotency_key', $data['idempotency_key'])->first();
                if ($existing) {
                    return $existing;
                }
            }
            throw $e;
        }

        Realtime::dispatch(new OrderCreated($order));

        return $order->load('items');
    }

    private function createInTransaction(array $data): Order
    {
        return DB::transaction(function () use ($data) {
            $lines = $this->buildLines($data['items']);
            $subtotal = array_sum(array_column($lines, 'line_total'));
            $totals = OrderTotals::calculate($subtotal);

            $queueNumber = DailyCounter::next('queue');
            $today = StoreSettings::now()->format('Ymd');

            $order = Order::create([
                ...$totals,
                'order_number' => sprintf('ORD-%s-%04d', $today, $queueNumber),
                'queue_number' => $queueNumber,
                'channel' => $data['channel'],
                'fulfillment' => $data['fulfillment'],
                'dining_table_id' => $data['dining_table_id'] ?? null,
                'customer_name' => $data['customer_name'],
                'customer_phone' => $data['customer_phone'] ?? null,
                'notes' => $data['notes'] ?? null,
                'user_id' => $data['user_id'] ?? null,
                'created_by' => $data['created_by'] ?? null,
                'idempotency_key' => $data['idempotency_key'] ?? null,
                'shift_id' => $data['shift_id'] ?? null,
                'access_token' => Str::random(40),
                'status' => OrderStatus::PendingPayment,
                'payment_status' => PaymentStatus::Unpaid,
                'payment_due_at' => $data['payment_due_at'] ?? null,
                'pickup_at' => $data['pickup_at'] ?? null,
            ]);

            $order->items()->createMany($lines);
            $this->log($order, null, OrderStatus::PendingPayment, $data['created_by'] ?? null);

            return $order;
        });
    }

    /**
     * Pesanan walk-in dari POS: dibuat dan dibayar dalam satu transaksi.
     * Jika pembayaran kurang, semuanya dibatalkan (termasuk potongan stok).
     * Tanpa pembayaran ($payLater) pesanan disimpan sebagai "belum dibayar" tanpa batas waktu.
     */
    public function createPosOrder(array $data, array $payments, User $staff, bool $payLater = false): Order
    {
        $shift = $this->requireShift($staff);

        if (! empty($data['idempotency_key'])) {
            $existing = Order::where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing) {
                return $existing->load(['items', 'payments', 'diningTable:id,name']);
            }
        }

        if (! $payLater && count($payments) === 0) {
            throw ValidationException::withMessages(['payments' => 'Tambahkan pembayaran atau pilih "Bayar nanti".']);
        }

        $order = DB::transaction(function () use ($data, $payments, $staff, $shift, $payLater) {
            $order = $this->createInTransaction([
                ...$data,
                'channel' => 'pos',
                'created_by' => $staff->id,
                'shift_id' => $shift->id,
                'payment_due_at' => null,
            ]);
            Realtime::dispatch(new OrderCreated($order));

            if ($payLater) {
                return $order;
            }

            foreach ($payments as $payment) {
                $this->recordStaffPayment($order, $payment, $staff);
            }

            $order->refresh();
            if ($order->payment_status !== PaymentStatus::Paid) {
                $remaining = $order->grand_total - $order->amountPaid();
                throw ValidationException::withMessages(['payments' => 'Pembayaran kurang Rp' . number_format($remaining, 0, ',', '.') . '.']);
            }

            return $order;
        });

        return $order->fresh(['items', 'payments', 'diningTable:id,name']);
    }

    /**
     * Kasir mencatat pembayaran tunai / QRIS statis / EDC. Mendukung split bayar.
     * Wajib ada shift kasir yang terbuka agar uang tercatat di laci yang benar.
     */
    public function recordStaffPayment(Order $order, array $data, User $staff): Payment
    {
        $shift = $this->requireShift($staff);

        [$payment, $order] = DB::transaction(function () use ($order, $data, $staff, $shift) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($order->status !== OrderStatus::PendingPayment || $order->payment_status !== PaymentStatus::Unpaid) {
                throw ValidationException::withMessages(['order' => 'Pesanan ini tidak sedang menunggu pembayaran.']);
            }

            $remaining = $order->grand_total - $order->amountPaid();
            $amount = (int) ($data['amount'] ?? $remaining);

            if ($amount <= 0 || $amount > $remaining) {
                throw ValidationException::withMessages(['amount' => "Nominal harus antara 1 dan {$remaining}."]);
            }

            $tendered = null;
            $change = null;
            if ($data['method'] === 'cash') {
                $tendered = (int) ($data['tendered'] ?? $amount);
                if ($tendered < $amount) {
                    throw ValidationException::withMessages(['tendered' => 'Uang diterima kurang dari nominal yang dibayar.']);
                }
                $change = $tendered - $amount;
            } elseif (empty($data['reference'])) {
                throw ValidationException::withMessages(['reference' => 'Nomor referensi wajib diisi untuk QRIS/EDC.']);
            }

            $payment = $order->payments()->create([
                'method' => $data['method'],
                'amount' => $amount,
                'tendered' => $tendered,
                'change' => $change,
                'reference' => $data['reference'] ?? null,
                'status' => 'paid',
                'shift_id' => $shift->id,
                'received_by' => $staff->id,
                'paid_at' => now(),
            ]);

            if ($order->amountPaid() >= $order->grand_total) {
                $this->markPaid($order, $staff->id);
            }

            return [$payment, $order];
        });

        Realtime::dispatch(new OrderStatusUpdated($order));

        return $payment;
    }

    /**
     * Pembayaran dari payment gateway (sudah diverifikasi). Idempoten per transaksi gateway.
     */
    public function applyGatewayPayment(Order $order, string $provider, string $transactionId, int $amount, array $payload): ?Payment
    {
        $result = DB::transaction(function () use ($order, $provider, $transactionId, $amount, $payload) {
            if (Payment::where('gateway_txn_id', $transactionId)->exists()) {
                return null; // notifikasi ganda
            }

            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            $payment = $order->payments()->create([
                'method' => 'gateway',
                'provider' => $provider,
                'amount' => $amount,
                'reference' => $payload['payment_type'] ?? null,
                'gateway_txn_id' => $transactionId,
                'status' => 'paid',
                'raw_payload' => $payload,
                'paid_at' => now(),
            ]);

            if ($order->status === OrderStatus::PendingPayment && $order->amountPaid() >= $order->grand_total) {
                $this->markPaid($order, null);
            } elseif ($order->status === OrderStatus::Cancelled) {
                // Uang masuk setelah pesanan kedaluwarsa: tandai lunas agar terlihat dan bisa di-refund manual.
                $order->payment_status = PaymentStatus::Paid;
                $order->paid_at = now();
                $order->remarks = 'Pembayaran diterima setelah pesanan dibatalkan. Perlu refund.';
                $order->save();
                Log::warning('Pembayaran gateway untuk pesanan yang sudah batal', ['order' => $order->order_number]);
            }

            return [$payment, $order];
        });

        if (! $result) {
            return null;
        }

        Realtime::dispatch(new OrderStatusUpdated($result[1]));

        return $result[0];
    }

    /**
     * Perubahan status maju oleh staf: queued -> preparing -> ready -> completed,
     * serta "buat ulang" (ready -> preparing) dengan alasan.
     */
    public function transition(Order $order, OrderStatus $to, ?User $actor, ?string $reason = null): Order
    {
        if (in_array($to, [OrderStatus::PendingPayment, OrderStatus::Queued, OrderStatus::Cancelled], true)) {
            throw ValidationException::withMessages(['status' => 'Gunakan aksi pembayaran atau pembatalan untuk status ini.']);
        }

        $order = DB::transaction(function () use ($order, $to, $actor, $reason) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            $from = $order->status;

            if (! $from->canMoveTo($to)) {
                throw ValidationException::withMessages([
                    'status' => "Status tidak bisa diubah dari \"{$from->label()}\" ke \"{$to->label()}\".",
                ]);
            }

            if ($from === OrderStatus::Ready && $to === OrderStatus::Preparing && blank($reason)) {
                throw ValidationException::withMessages(['reason' => 'Alasan wajib diisi untuk membuat ulang pesanan.']);
            }

            $activeItems = $order->items()->where('status', '!=', 'voided');

            match ($to) {
                OrderStatus::Preparing => (clone $activeItems)->update(['status' => 'preparing', 'started_at' => now(), 'ready_at' => null]),
                OrderStatus::Ready => (clone $activeItems)->update(['status' => 'ready', 'ready_at' => now()]),
                default => null,
            };

            $order->status = $to;
            if ($to === OrderStatus::Ready) {
                $order->ready_at = now();
            }
            if ($to === OrderStatus::Completed) {
                $order->completed_at = now();
            }
            $order->save();

            $this->log($order, $from, $to, $actor?->id, $reason);

            return $order;
        });

        Realtime::dispatch(new OrderStatusUpdated($order));

        return $order;
    }

    /**
     * Membatalkan pesanan. Pesanan lunas otomatis dibuatkan refund penuh.
     */
    public function cancel(Order $order, ?User $actor, string $reason, ?User $approver = null): Order
    {
        $order = DB::transaction(function () use ($order, $actor, $reason, $approver) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            $from = $order->status;

            if (! $from->canMoveTo(OrderStatus::Cancelled)) {
                throw ValidationException::withMessages([
                    'status' => "Pesanan berstatus \"{$from->label()}\" tidak bisa dibatalkan.",
                ]);
            }

            if ($from->releasesStockOnCancel()) {
                $this->releaseStock($order);
            }

            if ($order->payment_status === PaymentStatus::Paid) {
                $actorShift = $actor ? $this->openShiftFor($actor) : null;
                foreach ($order->payments()->where('status', 'paid')->get() as $payment) {
                    Refund::create([
                        'order_id' => $order->id,
                        'shift_id' => $actorShift?->id,
                        'payment_id' => $payment->id,
                        'amount' => $payment->amount,
                        'method' => $payment->method,
                        'reason' => $reason,
                        'approved_by' => $approver?->id ?? $actor?->id,
                        'created_by' => $actor?->id,
                    ]);
                }
                $order->payment_status = PaymentStatus::Refunded;
            }

            $order->items()->where('status', '!=', 'voided')->update([
                'status' => 'voided',
                'voided_at' => now(),
                'voided_by' => $actor?->id,
                'void_reason' => $reason,
            ]);

            $order->status = OrderStatus::Cancelled;
            $order->cancelled_at = now();
            $order->cancel_reason = $reason;
            $order->save();

            $this->log($order, $from, OrderStatus::Cancelled, $actor?->id, $reason);

            return $order;
        });

        Realtime::dispatch(new OrderStatusUpdated($order));

        return $order;
    }

    /**
     * Membatalkan pesanan belum lunas yang sudah lewat batas waktu bayar.
     * Pesanan lunas TIDAK PERNAH disentuh.
     */
    public function expireUnpaidOrders(): int
    {
        $count = 0;

        Order::where('status', OrderStatus::PendingPayment->value)
            ->where('payment_status', PaymentStatus::Unpaid->value)
            ->whereNotNull('payment_due_at')
            ->where('payment_due_at', '<', now())
            ->orderBy('created_at')
            ->each(function (Order $order) use (&$count) {
                try {
                    $this->cancel($order, null, 'Batas waktu pembayaran habis');
                    $count++;
                } catch (ValidationException) {
                    // Status berubah di antara query dan lock (misal baru saja dibayar): lewati.
                }
            });

        return $count;
    }

    /**
     * Perubahan status per item dari layar bar/dapur (KDS).
     * Status pesanan diturunkan: ada item dibuat -> preparing; semua item siap -> ready.
     *
     * @param  array<int>  $itemIds
     */
    public function setItemsStatus(Order $order, array $itemIds, string $status, ?User $actor): Order
    {
        if (! in_array($status, ['queued', 'preparing', 'ready'], true)) {
            throw ValidationException::withMessages(['status' => 'Status item tidak valid.']);
        }

        $order = DB::transaction(function () use ($order, $itemIds, $status, $actor) {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();

            if (! in_array($order->status, [OrderStatus::Queued, OrderStatus::Preparing, OrderStatus::Ready], true)) {
                throw ValidationException::withMessages(['status' => "Pesanan berstatus \"{$order->status->label()}\" tidak bisa diubah dari layar dapur."]);
            }

            $items = $order->items()->whereIn('id', $itemIds)->where('status', '!=', 'voided')->get();
            if ($items->isEmpty()) {
                throw ValidationException::withMessages(['items' => 'Item tidak ditemukan pada pesanan ini.']);
            }

            foreach ($items as $item) {
                $item->status = $status;
                if ($status === 'preparing') {
                    $item->started_at ??= now();
                    $item->ready_at = null;
                } elseif ($status === 'ready') {
                    $item->started_at ??= now();
                    $item->ready_at = now();
                } else {
                    $item->started_at = null;
                    $item->ready_at = null;
                }
                $item->save();
            }

            $active = $order->items()->where('status', '!=', 'voided')->pluck('status');
            $from = $order->status;
            $to = match (true) {
                $active->every(fn ($s) => $s === 'ready') => OrderStatus::Ready,
                $active->contains(fn ($s) => in_array($s, ['preparing', 'ready'], true)) => OrderStatus::Preparing,
                default => OrderStatus::Queued,
            };

            if ($to !== $from) {
                $order->status = $to;
                $order->ready_at = $to === OrderStatus::Ready ? now() : null;
                $order->save();
                $reason = $from === OrderStatus::Ready ? 'Dibuat ulang dari layar dapur' : null;
                $this->log($order, $from, $to, $actor?->id, $reason);
            }

            return $order;
        });

        Realtime::dispatch(new OrderStatusUpdated($order));

        return $order;
    }

    /**
     * Void satu item sebelum pesanan dibayar (PRD RFD-01). Total dihitung ulang dan stok item dikembalikan.
     */
    public function voidItem(OrderItem $item, User $actor, string $reason): Order
    {
        $order = DB::transaction(function () use ($item, $actor, $reason) {
            $order = Order::whereKey($item->order_id)->lockForUpdate()->firstOrFail();
            $item = $order->items()->whereKey($item->id)->firstOrFail();

            if ($order->status !== OrderStatus::PendingPayment || $order->amountPaid() > 0) {
                throw ValidationException::withMessages(['item' => 'Item hanya bisa di-void sebelum ada pembayaran. Gunakan pembatalan pesanan.']);
            }
            if ($item->status === 'voided') {
                throw ValidationException::withMessages(['item' => 'Item sudah di-void.']);
            }
            if ($order->items()->where('status', '!=', 'voided')->count() <= 1) {
                throw ValidationException::withMessages(['item' => 'Ini item terakhir. Batalkan pesanannya saja.']);
            }

            if ($item->product_id) {
                $product = Product::whereKey($item->product_id)->lockForUpdate()->first();
                if ($product?->track_stock) {
                    $product->increment('stock_quantity', $item->quantity);
                }
            }

            $item->update([
                'status' => 'voided',
                'voided_at' => now(),
                'voided_by' => $actor->id,
                'void_reason' => $reason,
            ]);

            $subtotal = (int) $order->items()->where('status', '!=', 'voided')->sum('line_total');
            $order->fill(OrderTotals::calculate($subtotal, $order->discount_total))->save();
            $this->log($order, $order->status, $order->status, $actor->id, "Void {$item->quantity}x {$item->product_name}: {$reason}");

            return $order;
        });

        Realtime::dispatch(new OrderStatusUpdated($order));

        return $order->load('items');
    }

    public function openShiftFor(User $user): ?Shift
    {
        return Shift::where('user_id', $user->id)->whereNull('closed_at')->latest('id')->first();
    }

    private function requireShift(User $staff): Shift
    {
        $shift = $this->openShiftFor($staff);
        if (! $shift) {
            throw ValidationException::withMessages(['shift' => 'Buka shift kasir terlebih dahulu sebelum menerima pembayaran.']);
        }

        return $shift;
    }

    private function markPaid(Order $order, ?int $actorId): void
    {
        $order->payment_status = PaymentStatus::Paid;
        $order->paid_at = now();
        $order->status = OrderStatus::Queued;
        $order->save();

        $this->log($order, OrderStatus::PendingPayment, OrderStatus::Queued, $actorId, 'Pembayaran lunas');
    }

    /**
     * Validasi item, modifier, ketersediaan, dan potong stok dengan penguncian baris.
     */
    private function buildLines(array $items): array
    {
        $productIds = array_unique(array_map(fn ($item) => (int) $item['product_id'], $items));

        $products = Product::with('modifierGroups.modifiers')
            ->whereIn('id', $productIds)
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $requestedQty = [];
        foreach ($items as $item) {
            $requestedQty[(int) $item['product_id']] = ($requestedQty[(int) $item['product_id']] ?? 0) + (int) $item['quantity'];
        }

        foreach ($requestedQty as $productId => $qty) {
            $product = $products->get($productId);
            if (! $product || ! $product->canFulfill($qty)) {
                $name = $product?->name ?? "#{$productId}";
                throw ValidationException::withMessages(['items' => "Produk {$name} sedang habis atau stok tidak mencukupi."]);
            }
        }

        $lines = [];
        foreach ($items as $index => $item) {
            $product = $products->get((int) $item['product_id']);
            $quantity = (int) $item['quantity'];
            [$modifiers, $modifiersTotal] = $this->resolveModifiers($product, $item['modifier_ids'] ?? [], $index);

            $lines[] = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'quantity' => $quantity,
                'unit_price' => $product->price,
                'modifiers' => $modifiers ?: null,
                'modifiers_total' => $modifiersTotal,
                'line_total' => ($product->price + $modifiersTotal) * $quantity,
                'notes' => $item['notes'] ?? null,
                'station' => $product->station,
                'status' => 'queued',
            ];
        }

        foreach ($requestedQty as $productId => $qty) {
            $product = $products->get($productId);
            if ($product->track_stock) {
                $product->decrement('stock_quantity', $qty);
            }
        }

        return $lines;
    }

    private function resolveModifiers(Product $product, array $modifierIds, int $index): array
    {
        $modifierIds = array_values(array_unique(array_map('intval', $modifierIds)));
        $selected = [];
        $total = 0;
        $matched = [];

        foreach ($product->modifierGroups as $group) {
            $chosen = $group->modifiers->whereIn('id', $modifierIds);
            $count = $chosen->count();

            if ($count < $group->min_select) {
                throw ValidationException::withMessages(["items.{$index}" => "Pilih {$group->name} untuk {$product->name}."]);
            }
            if ($group->max_select > 0 && $count > $group->max_select) {
                throw ValidationException::withMessages(["items.{$index}" => "Maksimal {$group->max_select} pilihan {$group->name} untuk {$product->name}."]);
            }

            foreach ($chosen as $modifier) {
                if (! $modifier->is_available) {
                    throw ValidationException::withMessages(["items.{$index}" => "Pilihan {$modifier->name} sedang habis."]);
                }
                $selected[] = ['id' => $modifier->id, 'group' => $group->name, 'name' => $modifier->name, 'price_delta' => $modifier->price_delta];
                $total += $modifier->price_delta;
                $matched[] = $modifier->id;
            }
        }

        if (count($matched) !== count($modifierIds)) {
            throw ValidationException::withMessages(["items.{$index}" => "Pilihan tidak valid untuk {$product->name}."]);
        }

        return [$selected, $total];
    }

    private function releaseStock(Order $order): void
    {
        $quantities = $order->items()
            ->where('status', '!=', 'voided')
            ->whereNotNull('product_id')
            ->get()
            ->groupBy('product_id')
            ->map(fn ($items) => $items->sum('quantity'));

        if ($quantities->isEmpty()) {
            return;
        }

        $products = Product::whereIn('id', $quantities->keys())->lockForUpdate()->get();
        foreach ($products as $product) {
            if ($product->track_stock) {
                $product->increment('stock_quantity', $quantities[$product->id]);
            }
        }
    }

    private function log(Order $order, ?OrderStatus $from, OrderStatus $to, ?int $userId, ?string $reason = null): void
    {
        OrderStatusLog::create([
            'order_id' => $order->id,
            'from' => $from?->value,
            'to' => $to->value,
            'user_id' => $userId,
            'reason' => $reason,
        ]);
    }
}
