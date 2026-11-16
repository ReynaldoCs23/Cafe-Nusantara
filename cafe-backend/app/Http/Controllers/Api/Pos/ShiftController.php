<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Services\OrderService;
use App\Services\ShiftService;
use App\Support\StoreSettings;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ShiftController extends Controller
{
    public function __construct(private ShiftService $shifts, private OrderService $orders)
    {
    }

    /** Shift yang sedang terbuka milik pengguna ini, beserta ringkasan kas. */
    public function current(Request $request)
    {
        $shift = $this->orders->openShiftFor($request->user());

        return response()->json([
            'data' => $shift ? $this->present($shift) : null,
        ]);
    }

    public function open(Request $request)
    {
        $validated = $request->validate([
            'opening_cash' => 'required|integer|min:0|max:100000000',
            'device_name' => 'nullable|string|max:50',
        ]);

        $shift = $this->shifts->open($request->user(), $validated['opening_cash'], $validated['device_name'] ?? null);

        return response()->json(['message' => 'Shift dibuka', 'data' => $this->present($shift)], 201);
    }

    public function movement(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:in,out',
            'amount' => 'required|integer|min:1|max:100000000',
            'reason' => 'required|string|min:3|max:255',
        ]);

        $shift = $this->requireOpenShift($request);
        $this->shifts->addMovement($shift, $validated['type'], $validated['amount'], $validated['reason'], $request->user());

        return response()->json(['message' => 'Kas dicatat', 'data' => $this->present($shift->fresh())], 201);
    }

    public function close(Request $request)
    {
        $validated = $request->validate([
            'counted_cash' => 'required|integer|min:0|max:100000000',
            'notes' => 'nullable|string|max:500',
        ]);

        $shift = $this->shifts->close($this->requireOpenShift($request), $validated['counted_cash'], $validated['notes'] ?? null, $request->user());

        return response()->json(['message' => 'Shift ditutup', 'data' => $this->present($shift)]);
    }

    /** Riwayat shift untuk manager/owner. */
    public function index(Request $request)
    {
        $shifts = Shift::with(['user:id,name', 'closer:id,name'])
            ->orderByDesc('opened_at')
            ->limit(100)
            ->get();

        return response()->json(['data' => $shifts]);
    }

    public function show(string $id)
    {
        $shift = Shift::with(['user:id,name', 'closer:id,name'])->findOrFail($id);

        return response()->json(['data' => $this->present($shift)]);
    }

    private function requireOpenShift(Request $request): Shift
    {
        $shift = $this->orders->openShiftFor($request->user());
        if (! $shift) {
            throw ValidationException::withMessages(['shift' => 'Tidak ada shift yang terbuka.']);
        }

        return $shift;
    }

    private function present(Shift $shift): array
    {
        $shift->loadMissing('user:id,name', 'closer:id,name');

        return [
            ...$shift->toArray(),
            'summary' => $shift->isOpen() ? $this->shifts->summary($shift) : $shift->summary,
            'warnings' => $shift->isOpen() ? $this->shifts->pendingWarnings() : null,
            'store' => array_intersect_key(StoreSettings::all(), array_flip(['store_name', 'store_address', 'store_phone', 'timezone'])),
        ];
    }
}
