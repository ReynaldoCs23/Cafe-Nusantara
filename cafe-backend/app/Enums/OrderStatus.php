<?php

namespace App\Enums;

enum OrderStatus: string
{
    case PendingPayment = 'pending_payment';
    case Queued = 'queued';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PendingPayment => 'Menunggu pembayaran',
            self::Queued => 'Pesanan diterima',
            self::Preparing => 'Sedang dibuat',
            self::Ready => 'Siap',
            self::Completed => 'Selesai',
            self::Cancelled => 'Dibatalkan',
        };
    }

    /** Transisi maju yang diizinkan (pembatalan ditangani terpisah). */
    public function canMoveTo(self $to): bool
    {
        return in_array($to, match ($this) {
            self::PendingPayment => [self::Queued, self::Cancelled],
            self::Queued => [self::Preparing, self::Ready, self::Cancelled],
            self::Preparing => [self::Ready, self::Cancelled],
            self::Ready => [self::Completed, self::Preparing, self::Cancelled],
            self::Completed, self::Cancelled => [],
        }, true);
    }

    public function isActive(): bool
    {
        return in_array($this, [self::Queued, self::Preparing, self::Ready], true);
    }

    /** Stok dikembalikan jika pesanan dibatalkan sebelum mulai dibuat. */
    public function releasesStockOnCancel(): bool
    {
        return in_array($this, [self::PendingPayment, self::Queued], true);
    }
}
