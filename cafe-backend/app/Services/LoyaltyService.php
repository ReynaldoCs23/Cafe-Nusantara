<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\User;
use App\Support\StoreSettings;
use Illuminate\Validation\ValidationException;

/**
 * Poin member (bisa dinonaktifkan di Pengaturan, jawaban PRD Q7).
 * Dapat poin: setiap kelipatan "loyalty_earn_amount" dari total yang dibayar.
 * Tukar poin: 1 poin = "loyalty_point_value" rupiah, minimal & maksimal persen dari belanja diatur owner.
 * Semua perubahan saldo dicatat di loyalty_transactions.
 */
class LoyaltyService
{
    public function enabled(): bool
    {
        return (bool) StoreSettings::get('loyalty_enabled');
    }

    public function eligible(?User $user): bool
    {
        return $user !== null && $user->role === Role::Customer->value;
    }

    /** Validasi permintaan tukar poin. Mengembalikan [poin dipakai, nilai rupiah] setelah dibatasi persen maksimal. */
    public function redemptionFor(?User $user, int $points, int $base, bool $alreadyDeducted = false): array
    {
        if ($points <= 0) {
            return [0, 0];
        }

        $min = (int) StoreSettings::get('loyalty_min_redeem');
        if (! $alreadyDeducted) {
            if (! $this->enabled()) {
                throw ValidationException::withMessages(['redeem_points' => 'Program poin sedang tidak aktif.']);
            }
            if (! $this->eligible($user)) {
                throw ValidationException::withMessages(['redeem_points' => 'Tukar poin hanya untuk member terdaftar.']);
            }
            if ($points < $min) {
                throw ValidationException::withMessages(['redeem_points' => "Minimal penukaran {$min} poin."]);
            }
            if ($points > $user->loyalty_points) {
                throw ValidationException::withMessages(['redeem_points' => "Poin tidak cukup. Saldo {$user->loyalty_points} poin."]);
            }
        }

        $value = max(1, (int) StoreSettings::get('loyalty_point_value'));
        $maxValue = (int) floor($base * (float) StoreSettings::get('loyalty_max_redeem_percent') / 100);
        $usable = min($points, intdiv($maxValue, $value));

        return [$usable, $usable * $value];
    }

    public function earnFor(Order $order): void
    {
        if (! $this->enabled() || ! $order->user_id || $order->points_earned > 0) {
            return;
        }
        $user = User::find($order->user_id);
        if (! $this->eligible($user)) {
            return;
        }

        $per = max(1, (int) StoreSettings::get('loyalty_earn_amount'));
        $points = intdiv($order->grand_total, $per);
        if ($points <= 0) {
            return;
        }

        $this->change($user, $points, 'earn', $order, "Belanja #{$order->queue_number}");
        $order->points_earned = $points;
        $order->save();
    }

    public function redeem(User $user, int $points, Order $order, ?User $actor = null): void
    {
        $this->change($user, -$points, 'redeem', $order, "Tukar poin #{$order->queue_number}", $actor);
    }

    /** Kembalikan poin yang ditukar (pesanan batal / potongan poin berkurang). */
    public function refundRedeemed(Order $order, int $points, string $note, ?User $actor = null): void
    {
        if ($points > 0 && $order->user_id && ($user = User::find($order->user_id))) {
            $this->change($user, $points, 'refund', $order, $note, $actor);
        }
    }

    /** Tarik kembali poin yang didapat (pesanan batal / refund). */
    public function revertEarned(Order $order, int $points, string $note, ?User $actor = null): void
    {
        $points = min($points, $order->points_earned);
        if ($points <= 0 || ! $order->user_id || ! ($user = User::find($order->user_id))) {
            return;
        }
        $this->change($user, -$points, 'revert', $order, $note, $actor);
        $order->points_earned -= $points;
        $order->save();
    }

    public function adjust(User $user, int $points, string $note, User $actor): LoyaltyTransaction
    {
        return $this->change($user, $points, 'adjust', null, $note, $actor);
    }

    /** Ubah saldo dengan penguncian baris; saldo tidak pernah negatif. */
    private function change(User $user, int $delta, string $type, ?Order $order, string $note, ?User $actor = null): LoyaltyTransaction
    {
        $user = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
        $before = $user->loyalty_points;
        $after = max(0, $before + $delta);

        $user->forceFill(['loyalty_points' => $after])->saveQuietly();

        return LoyaltyTransaction::create([
            'user_id' => $user->id,
            'order_id' => $order?->id,
            'type' => $type,
            'points' => $after - $before,
            'balance_after' => $after,
            'note' => $note,
            'created_by' => $actor?->id,
        ]);
    }
}
