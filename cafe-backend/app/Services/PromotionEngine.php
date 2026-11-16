<?php

namespace App\Services;

use App\Models\Promotion;
use App\Support\StoreSettings;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

/**
 * Menghitung promo (PRD PRM-02/03).
 * Satu pesanan hanya mendapat SATU promo: voucher yang dimasukkan, atau promo otomatis dengan potongan terbesar.
 *
 * Baris pesanan: ['product_id' => int, 'category_id' => ?int, 'quantity' => int, 'unit_total' => int, 'line_total' => int]
 */
class PromotionEngine
{
    private const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    /**
     * @return array{promotion: ?Promotion, amount: int}
     */
    public function best(array $lines, string $channel, ?string $code = null, ?CarbonImmutable $at = null): array
    {
        $at ??= StoreSettings::now();

        if (filled($code)) {
            $promotion = Promotion::where('code', strtoupper(trim($code)))->first();
            if (! $promotion) {
                throw ValidationException::withMessages(['voucher_code' => 'Kode voucher tidak ditemukan.']);
            }
            $result = $this->evaluate($promotion, $lines, $channel, $at);
            if (! $result['eligible']) {
                throw ValidationException::withMessages(['voucher_code' => $result['reason']]);
            }

            return ['promotion' => $promotion, 'amount' => $result['amount']];
        }

        $best = ['promotion' => null, 'amount' => 0];
        foreach (Promotion::whereNull('code')->where('is_active', true)->get() as $promotion) {
            $result = $this->evaluate($promotion, $lines, $channel, $at);
            if ($result['eligible'] && $result['amount'] > $best['amount']) {
                $best = ['promotion' => $promotion, 'amount' => $result['amount']];
            }
        }

        return $best;
    }

    /**
     * @return array{eligible: bool, amount: int, reason: ?string}
     */
    public function evaluate(Promotion $p, array $lines, string $channel, ?CarbonImmutable $at = null, bool $ignoreQuota = false): array
    {
        $at = ($at ?? StoreSettings::now())->setTimezone(StoreSettings::get('timezone', 'Asia/Jakarta'));
        $no = fn (string $reason) => ['eligible' => false, 'amount' => 0, 'reason' => $reason];

        if (! $p->is_active) {
            return $no('Promo ini sedang tidak aktif.');
        }
        if ($p->starts_on && $at->toDateString() < $p->starts_on->toDateString()) {
            return $no('Promo belum dimulai.');
        }
        if ($p->ends_on && $at->toDateString() > $p->ends_on->toDateString()) {
            return $no('Promo sudah berakhir.');
        }
        if ($p->days && ! in_array(self::DAYS[$at->dayOfWeekIso - 1], $p->days, true)) {
            return $no('Promo tidak berlaku hari ini.');
        }
        if ($p->start_time && $p->end_time && ! $this->withinTime($at->format('H:i'), $p->start_time, $p->end_time)) {
            return $no("Promo hanya berlaku pukul {$p->start_time}–{$p->end_time}.");
        }
        if ($p->channels && ! in_array($channel, $p->channels, true)) {
            return $no('Promo tidak berlaku untuk cara pemesanan ini.');
        }
        if (! $ignoreQuota && $p->quota !== null && $p->used_count >= $p->quota) {
            return $no('Kuota promo sudah habis.');
        }

        $subtotal = array_sum(array_column($lines, 'line_total'));
        if ($subtotal < $p->min_subtotal) {
            return $no('Minimal belanja Rp' . number_format($p->min_subtotal, 0, ',', '.') . ' untuk promo ini.');
        }

        $eligible = array_values(array_filter($lines, fn ($line) => $this->matchesScope($p, $line)));
        if (! $eligible) {
            return $no('Tidak ada menu di keranjang yang termasuk promo ini.');
        }

        $base = array_sum(array_column($eligible, 'line_total'));
        $amount = match ($p->type) {
            'percent' => (int) round($base * min(100, $p->value) / 100),
            'amount' => min($p->value, $base),
            'bogo' => $this->bogoDiscount($p, $eligible),
            default => 0,
        };

        if ($p->type === 'percent' && $p->max_discount) {
            $amount = min($amount, $p->max_discount);
        }

        if ($amount <= 0) {
            return $p->type === 'bogo'
                ? $no("Tambahkan menu hingga {$p->buy_quantity} + {$p->get_quantity} untuk mendapat gratis.")
                : $no('Promo tidak menghasilkan potongan untuk keranjang ini.');
        }

        return ['eligible' => true, 'amount' => min($amount, $subtotal), 'reason' => null];
    }

    /** Beli X gratis Y: item termurah di antara item yang berlaku menjadi gratis. */
    private function bogoDiscount(Promotion $p, array $lines): int
    {
        $buy = max(1, (int) $p->buy_quantity);
        $get = max(1, (int) $p->get_quantity);

        $units = [];
        foreach ($lines as $line) {
            for ($i = 0; $i < $line['quantity']; $i++) {
                $units[] = $line['unit_total'];
            }
        }
        sort($units);

        $free = intdiv(count($units), $buy + $get) * $get;

        return array_sum(array_slice($units, 0, $free));
    }

    private function matchesScope(Promotion $p, array $line): bool
    {
        $ids = array_map('intval', $p->scope_ids ?? []);

        return match ($p->scope) {
            'category' => in_array((int) ($line['category_id'] ?? 0), $ids, true),
            'product' => in_array((int) $line['product_id'], $ids, true),
            default => true,
        };
    }

    private function withinTime(string $now, string $start, string $end): bool
    {
        return $end <= $start ? ($now >= $start || $now < $end) : ($now >= $start && $now < $end);
    }
}
