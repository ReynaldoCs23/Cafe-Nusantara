<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Shift kasir & kas laci (PRD SFT-01..05).
 * Kas seharusnya = modal + tunai masuk + kas masuk - kas keluar - refund tunai.
 */
class ShiftService
{
    public function open(User $user, int $openingCash, ?string $device = null): Shift
    {
        return DB::transaction(function () use ($user, $openingCash, $device) {
            $existing = Shift::where('user_id', $user->id)->whereNull('closed_at')->lockForUpdate()->first();
            if ($existing) {
                throw ValidationException::withMessages(['shift' => 'Anda masih punya shift yang terbuka.']);
            }

            return Shift::create([
                'user_id' => $user->id,
                'device_name' => $device,
                'opened_at' => now(),
                'opening_cash' => $openingCash,
            ]);
        });
    }

    public function addMovement(Shift $shift, string $type, int $amount, string $reason, User $user)
    {
        $this->assertOpen($shift);

        if ($type === 'out' && $amount > $this->summary($shift)['expected_cash']) {
            throw ValidationException::withMessages(['amount' => 'Kas keluar melebihi uang di laci.']);
        }

        return $shift->cashMovements()->create([
            'type' => $type,
            'amount' => $amount,
            'reason' => $reason,
            'user_id' => $user->id,
        ]);
    }

    public function summary(Shift $shift): array
    {
        $payments = Payment::where('shift_id', $shift->id)->where('status', 'paid');

        $byMethod = (clone $payments)
            ->selectRaw('method, COUNT(*) as count, SUM(amount) as amount')
            ->groupBy('method')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->method => ['count' => (int) $row->count, 'amount' => (int) $row->amount]]);

        $cashSales = (int) ($byMethod['cash']['amount'] ?? 0);
        $refunds = Refund::where('shift_id', $shift->id);
        $cashRefunds = (int) (clone $refunds)->where('method', 'cash')->sum('amount');
        $movements = $shift->cashMovements()->get();
        $cashIn = (int) $movements->where('type', 'in')->sum('amount');
        $cashOut = (int) $movements->where('type', 'out')->sum('amount');

        $orderIds = (clone $payments)->distinct()->pluck('order_id');

        return [
            'opening_cash' => $shift->opening_cash,
            'cash_sales' => $cashSales,
            'cash_in' => $cashIn,
            'cash_out' => $cashOut,
            'cash_refunds' => $cashRefunds,
            'expected_cash' => $shift->opening_cash + $cashSales + $cashIn - $cashOut - $cashRefunds,
            'payments_total' => (int) (clone $payments)->sum('amount'),
            'refunds_total' => (int) (clone $refunds)->sum('amount'),
            'by_method' => $byMethod,
            'transaction_count' => $orderIds->count(),
            'movements' => $movements->map->only(['id', 'type', 'amount', 'reason', 'created_at'])->values(),
        ];
    }

    /**
     * Pesanan yang masih perlu perhatian saat tutup shift (PRD SFT-05).
     */
    public function pendingWarnings(): array
    {
        return [
            'unpaid_orders' => Order::where('status', OrderStatus::PendingPayment->value)->count(),
            'active_orders' => Order::whereIn('status', [
                OrderStatus::Queued->value, OrderStatus::Preparing->value, OrderStatus::Ready->value,
            ])->count(),
        ];
    }

    public function close(Shift $shift, int $countedCash, ?string $notes, User $closer): Shift
    {
        return DB::transaction(function () use ($shift, $countedCash, $notes, $closer) {
            $shift = Shift::whereKey($shift->id)->lockForUpdate()->firstOrFail();
            $this->assertOpen($shift);

            $summary = $this->summary($shift);

            $shift->update([
                'closed_at' => now(),
                'closed_by' => $closer->id,
                'expected_cash' => $summary['expected_cash'],
                'counted_cash' => $countedCash,
                'difference' => $countedCash - $summary['expected_cash'],
                'summary' => $summary,
                'notes' => $notes,
            ]);

            return $shift;
        });
    }

    private function assertOpen(Shift $shift): void
    {
        if (! $shift->isOpen()) {
            throw ValidationException::withMessages(['shift' => 'Shift ini sudah ditutup.']);
        }
    }
}
