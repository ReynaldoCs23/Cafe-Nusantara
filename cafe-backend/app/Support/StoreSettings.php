<?php

namespace App\Support;

use App\Models\WebsiteSetting;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

/**
 * Pengaturan operasional toko (pajak, jam buka, batas waktu, fitur opsional).
 * Disimpan di tabel website_settings dengan type = 'store' dan nilai JSON.
 */
class StoreSettings
{
    private const CACHE_KEY = 'store_settings.v1';

    public const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    public const DEFAULTS = [
        'store_name' => 'Cafe Nusantara',
        'store_address' => '',
        'store_phone' => '',
        'receipt_footer' => 'Terima kasih atas kunjungan Anda',
        'timezone' => 'Asia/Jakarta',

        // Harga menu belum termasuk PB1 (jawaban PRD Q4)
        'tax_rate' => 10,
        'tax_inclusive' => false,
        'service_charge_enabled' => false,
        'service_charge_rate' => 5,
        'rounding' => 0, // 0 = tanpa pembulatan, 100, 500

        'opening_hours' => [
            'mon' => ['open' => '08:00', 'close' => '22:00', 'closed' => false],
            'tue' => ['open' => '08:00', 'close' => '22:00', 'closed' => false],
            'wed' => ['open' => '08:00', 'close' => '22:00', 'closed' => false],
            'thu' => ['open' => '08:00', 'close' => '22:00', 'closed' => false],
            'fri' => ['open' => '08:00', 'close' => '22:00', 'closed' => false],
            'sat' => ['open' => '08:00', 'close' => '22:00', 'closed' => false],
            'sun' => ['open' => '08:00', 'close' => '22:00', 'closed' => false],
        ],
        'temporarily_closed' => false,

        'pay_at_cashier_enabled' => true,
        'online_payment_enabled' => false, // aktif setelah gateway dikonfigurasi (Fase 3)
        'qr_payment_timeout_minutes' => 15,
        'preorder_lead_minutes' => 15,
        'max_orders_per_hour' => 0, // 0 = tanpa batas (jawaban PRD Q8: bisa diatur)

        'kds_warning_minutes' => 10,
        'kds_critical_minutes' => 15,
        'ready_overdue_minutes' => 10,

        'loyalty_enabled' => false, // jawaban PRD Q7: fitur bisa dinonaktifkan
    ];

    /** Kunci yang aman ditampilkan ke publik. */
    public const PUBLIC_KEYS = [
        'store_name', 'store_address', 'store_phone', 'timezone',
        'tax_rate', 'tax_inclusive', 'service_charge_enabled', 'service_charge_rate', 'rounding',
        'opening_hours', 'temporarily_closed',
        'pay_at_cashier_enabled', 'online_payment_enabled', 'loyalty_enabled',
        'qr_payment_timeout_minutes',
    ];

    public static function encode(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE);
    }

    public static function all(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, function () {
            return WebsiteSetting::query()
                ->whereIn('key', array_keys(self::DEFAULTS))
                ->pluck('value', 'key')
                ->map(fn ($value) => $value === null ? null : json_decode($value, true))
                ->all();
        });

        $settings = [];
        foreach (self::DEFAULTS as $key => $default) {
            $settings[$key] = array_key_exists($key, $stored) && $stored[$key] !== null ? $stored[$key] : $default;
        }

        return $settings;
    }

    public static function get(string $key, mixed $fallback = null): mixed
    {
        return self::all()[$key] ?? $fallback ?? (self::DEFAULTS[$key] ?? null);
    }

    public static function set(array $values): void
    {
        foreach ($values as $key => $value) {
            if (! array_key_exists($key, self::DEFAULTS)) {
                continue;
            }
            WebsiteSetting::updateOrCreate(
                ['key' => $key],
                ['value' => self::encode($value), 'type' => 'store']
            );
        }

        self::flush();
    }

    public static function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public static function publicSettings(): array
    {
        return array_intersect_key(self::all(), array_flip(self::PUBLIC_KEYS));
    }

    public static function now(): CarbonImmutable
    {
        return CarbonImmutable::now(self::get('timezone', 'Asia/Jakarta'));
    }

    /** Apakah toko menerima pesanan pelanggan (QR/online) saat ini. */
    public static function isOpen(?CarbonImmutable $at = null): bool
    {
        if (self::get('temporarily_closed')) {
            return false;
        }

        $at = ($at ?? self::now())->setTimezone(self::get('timezone', 'Asia/Jakarta'));
        $day = self::DAYS[$at->dayOfWeekIso - 1];
        $hours = self::get('opening_hours')[$day] ?? null;

        if (! $hours || ! empty($hours['closed'])) {
            return false;
        }

        $time = $at->format('H:i');
        $open = $hours['open'] ?? '00:00';
        $close = $hours['close'] ?? '23:59';

        // Mendukung jam tutup lewat tengah malam (misal 16:00 - 01:00)
        if ($close <= $open) {
            return $time >= $open || $time < $close;
        }

        return $time >= $open && $time < $close;
    }
}
