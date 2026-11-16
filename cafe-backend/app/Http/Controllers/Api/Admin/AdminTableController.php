<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiningTable;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Manajemen meja (PRD TBL-01). Cetak QR & rotasi token menyusul di Fase 2.
 */
class AdminTableController extends Controller
{
    public function index()
    {
        return response()->json(['data' => DiningTable::orderBy('area')->orderBy('name')->get()]);
    }

    public function store(Request $request)
    {
        $table = DiningTable::create($this->validated($request));

        return response()->json(['message' => 'Meja ditambahkan', 'data' => $table], 201);
    }

    public function show(string $id)
    {
        return response()->json(['data' => DiningTable::findOrFail($id)]);
    }

    public function update(Request $request, string $id)
    {
        $table = DiningTable::findOrFail($id);
        $table->update($this->validated($request, $table));

        return response()->json(['message' => 'Meja diperbarui', 'data' => $table]);
    }

    /**
     * Buat token QR baru (PRD QR-07). QR lama langsung tidak berlaku,
     * misalnya jika stiker QR difoto dan disalahgunakan dari luar cafe.
     */
    public function rotateQr(string $id)
    {
        $table = DiningTable::findOrFail($id);
        $table->update(['qr_token' => DiningTable::newToken()]);
        Audit::log('table.qr_rotated', $table, "QR {$table->name} dibuat ulang");

        return response()->json(['message' => "QR {$table->name} diperbarui. Cetak ulang QR untuk meja ini.", 'data' => $table]);
    }

    public function destroy(string $id)
    {
        DiningTable::findOrFail($id)->delete();

        return response()->json(['message' => 'Meja dihapus']);
    }

    private function validated(Request $request, ?DiningTable $table = null): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('dining_tables', 'name')->ignore($table?->id)],
            'area' => 'nullable|string|max:50',
            'capacity' => 'nullable|integer|min:1|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        // area boleh dikosongkan; kolom lain memakai nilai default jika tidak dikirim
        return array_filter($validated, fn ($value, $key) => $value !== null || $key === 'area', ARRAY_FILTER_USE_BOTH);
    }
}
