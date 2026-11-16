<?php

namespace App\Services;

use App\Support\StoreSettings;

/**
 * Menghitung service charge, pajak (PB1/PBJT), dan pembulatan sesuai pengaturan toko.
 * Urutan: subtotal - diskon -> + service charge -> + pajak -> pembulatan.
 */
class OrderTotals
{
    public static function calculate(int $subtotal, int $discount = 0, ?array $settings = null): array
    {
        $settings ??= StoreSettings::all();

        $base = max(0, $subtotal - $discount);

        $serviceCharge = $settings['service_charge_enabled']
            ? (int) round($base * ((float) $settings['service_charge_rate']) / 100)
            : 0;

        $taxable = $base + $serviceCharge;
        $taxRate = (float) $settings['tax_rate'];

        if ($settings['tax_inclusive']) {
            $tax = (int) round($taxable - ($taxable / (1 + $taxRate / 100)));
            $total = $taxable;
        } else {
            $tax = (int) round($taxable * $taxRate / 100);
            $total = $taxable + $tax;
        }

        $rounding = 0;
        $step = (int) $settings['rounding'];
        if ($step > 0) {
            $rounded = (int) (round($total / $step) * $step);
            $rounding = $rounded - $total;
            $total = $rounded;
        }

        return [
            'subtotal' => $subtotal,
            'discount_total' => min($discount, $subtotal),
            'service_charge' => $serviceCharge,
            'tax_amount' => $tax,
            'rounding' => $rounding,
            'grand_total' => $total,
        ];
    }
}
