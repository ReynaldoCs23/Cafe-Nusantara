<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use App\Support\StoreSettings;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminSettingsController extends Controller
{
    public function show()
    {
        return response()->json(['data' => StoreSettings::all()]);
    }

    public function update(Request $request)
    {
        $time = 'regex:/^([01]\d|2[0-3]):[0-5]\d$/';

        $rules = [
            'store_name' => 'sometimes|required|string|max:100',
            'store_address' => 'sometimes|nullable|string|max:255',
            'store_phone' => 'sometimes|nullable|string|max:30',
            'receipt_footer' => 'sometimes|nullable|string|max:255',
            'timezone' => ['sometimes', 'required', Rule::in(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'])],
            'tax_rate' => 'sometimes|required|numeric|min:0|max:100',
            'tax_inclusive' => 'sometimes|required|boolean',
            'service_charge_enabled' => 'sometimes|required|boolean',
            'service_charge_rate' => 'sometimes|required|numeric|min:0|max:100',
            'rounding' => ['sometimes', 'required', 'integer', Rule::in([0, 100, 500, 1000])],
            'opening_hours' => 'sometimes|required|array',
            'temporarily_closed' => 'sometimes|required|boolean',
            'pay_at_cashier_enabled' => 'sometimes|required|boolean',
            'online_payment_enabled' => 'sometimes|required|boolean',
            'qr_payment_timeout_minutes' => 'sometimes|required|integer|min:5|max:120',
            'preorder_lead_minutes' => 'sometimes|required|integer|min:0|max:180',
            'max_orders_per_hour' => 'sometimes|required|integer|min:0|max:10000',
            'kds_warning_minutes' => 'sometimes|required|integer|min:1|max:120',
            'kds_critical_minutes' => 'sometimes|required|integer|min:1|max:240',
            'ready_overdue_minutes' => 'sometimes|required|integer|min:1|max:120',
            'loyalty_enabled' => 'sometimes|required|boolean',
            'discount_approval_percent' => 'sometimes|required|numeric|min:0|max:100',
        ];

        foreach (StoreSettings::DAYS as $day) {
            $rules["opening_hours.{$day}"] = 'required_with:opening_hours|array';
            $rules["opening_hours.{$day}.open"] = ['required_with:opening_hours', $time];
            $rules["opening_hours.{$day}.close"] = ['required_with:opening_hours', $time];
            $rules["opening_hours.{$day}.closed"] = 'required_with:opening_hours|boolean';
        }

        $validated = $request->validate($rules);

        if (isset($validated['opening_hours'])) {
            $validated['opening_hours'] = collect(StoreSettings::DAYS)->mapWithKeys(fn ($day) => [$day => [
                'open' => $validated['opening_hours'][$day]['open'],
                'close' => $validated['opening_hours'][$day]['close'],
                'closed' => (bool) $validated['opening_hours'][$day]['closed'],
            ]])->all();
        }

        foreach (['tax_rate', 'service_charge_rate', 'discount_approval_percent'] as $key) {
            if (isset($validated[$key])) {
                $validated[$key] = $validated[$key] + 0; // simpan sebagai angka
            }
        }

        if (! empty($validated['online_payment_enabled']) && blank(config('services.midtrans.server_key'))) {
            return response()->json([
                'message' => 'Pembayaran online belum bisa diaktifkan: kunci Midtrans belum diisi di server.',
                'errors' => ['online_payment_enabled' => ['Kunci Midtrans belum dikonfigurasi.']],
            ], 422);
        }

        $before = StoreSettings::all();
        StoreSettings::set($validated);

        $changes = [];
        foreach ($validated as $key => $value) {
            if (($before[$key] ?? null) != $value) {
                $changes[$key] = ['from' => $before[$key] ?? null, 'to' => $value];
            }
        }
        if ($changes) {
            Audit::log('settings.updated', null, 'Pengaturan toko: ' . implode(', ', array_keys($changes)), $changes);
        }

        return response()->json([
            'message' => 'Pengaturan toko disimpan',
            'data' => StoreSettings::all(),
        ]);
    }
}
