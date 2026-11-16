<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Promotion;
use App\Support\StoreSettings;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Kelola promo terjadwal & voucher (PRD PRM-02/03). */
class AdminPromotionController extends Controller
{
    public function index()
    {
        $stats = Order::whereNotNull('promotion_id')
            ->whereIn('payment_status', ['paid', 'partially_refunded'])
            ->selectRaw('promotion_id, COUNT(*) as orders, SUM(promo_discount) as discount, SUM(grand_total) as revenue')
            ->groupBy('promotion_id')
            ->get()
            ->keyBy('promotion_id');

        $promotions = Promotion::orderByDesc('is_active')->orderByDesc('id')->get()
            ->map(fn (Promotion $p) => [
                ...$p->toArray(),
                'stats' => [
                    'orders' => (int) ($stats[$p->id]->orders ?? 0),
                    'discount' => (int) ($stats[$p->id]->discount ?? 0),
                    'revenue' => (int) ($stats[$p->id]->revenue ?? 0),
                ],
            ]);

        return response()->json(['data' => $promotions]);
    }

    public function store(Request $request)
    {
        $promotion = Promotion::create($this->validated($request));

        return response()->json(['message' => 'Promo dibuat', 'data' => $promotion], 201);
    }

    public function show(string $id)
    {
        return response()->json(['data' => Promotion::findOrFail($id)]);
    }

    public function update(Request $request, string $id)
    {
        $promotion = Promotion::findOrFail($id);
        $promotion->update($this->validated($request, $promotion));

        return response()->json(['message' => 'Promo diperbarui', 'data' => $promotion]);
    }

    public function destroy(string $id)
    {
        Promotion::findOrFail($id)->delete();

        return response()->json(['message' => 'Promo dihapus']);
    }

    private function validated(Request $request, ?Promotion $promotion = null): array
    {
        $time = 'regex:/^([01]\d|2[0-3]):[0-5]\d$/';

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'type' => ['required', Rule::in(Promotion::TYPES)],
            'value' => 'required_unless:type,bogo|nullable|integer|min:1',
            'buy_quantity' => 'required_if:type,bogo|nullable|integer|min:1|max:20',
            'get_quantity' => 'required_if:type,bogo|nullable|integer|min:1|max:20',
            'max_discount' => 'nullable|integer|min:1',
            'scope' => ['required', Rule::in(Promotion::SCOPES)],
            'scope_ids' => 'required_unless:scope,order|nullable|array',
            'scope_ids.*' => 'integer',
            'min_subtotal' => 'nullable|integer|min:0',
            'channels' => 'nullable|array',
            'channels.*' => Rule::in(Order::CHANNELS),
            'days' => 'nullable|array',
            'days.*' => Rule::in(StoreSettings::DAYS),
            'start_time' => ['nullable', 'required_with:end_time', $time],
            'end_time' => ['nullable', 'required_with:start_time', $time],
            'starts_on' => 'nullable|date',
            'ends_on' => 'nullable|date|after_or_equal:starts_on',
            'code' => ['nullable', 'string', 'max:40', 'alpha_dash', Rule::unique('promotions', 'code')->ignore($promotion?->id)],
            'quota' => 'nullable|integer|min:1',
            'is_active' => 'nullable|boolean',
        ]);

        if ($data['type'] === 'percent' && ($data['value'] ?? 0) > 100) {
            throw ValidationException::withMessages(['value' => 'Diskon persen maksimal 100.']);
        }
        if ($data['type'] === 'bogo' && $data['scope'] === 'order') {
            throw ValidationException::withMessages(['scope' => 'Promo beli X gratis Y harus dipasang ke kategori atau produk tertentu.']);
        }

        $data['code'] = filled($data['code'] ?? null) ? strtoupper($data['code']) : null;
        $data['value'] = $data['type'] === 'bogo' ? 0 : $data['value'];
        $data['scope_ids'] = $data['scope'] === 'order' ? null : array_values(array_unique($data['scope_ids'] ?? []));
        $data['channels'] = empty($data['channels']) ? null : array_values($data['channels']);
        $data['days'] = empty($data['days']) ? null : array_values($data['days']);
        $data['min_subtotal'] ??= 0;
        $data['is_active'] ??= true;

        return $data;
    }
}
