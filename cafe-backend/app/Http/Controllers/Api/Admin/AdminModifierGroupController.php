<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ModifierGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Grup modifier beserta pilihannya dikelola dalam satu form:
 * pilihan yang tidak dikirim lagi akan dihapus.
 */
class AdminModifierGroupController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => ModifierGroup::with('modifiers')->withCount('products')->orderBy('sort_order')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);

        $group = DB::transaction(function () use ($validated) {
            $group = ModifierGroup::create($validated);
            $this->syncModifiers($group, $validated['modifiers']);

            return $group;
        });

        return response()->json([
            'message' => 'Grup pilihan berhasil ditambahkan',
            'data' => $group->load('modifiers'),
        ], 201);
    }

    public function show(string $id)
    {
        return response()->json(['data' => ModifierGroup::with('modifiers')->findOrFail($id)]);
    }

    public function update(Request $request, string $id)
    {
        $group = ModifierGroup::findOrFail($id);
        $validated = $this->validated($request);

        DB::transaction(function () use ($group, $validated) {
            $group->update($validated);
            $this->syncModifiers($group, $validated['modifiers']);
        });

        return response()->json([
            'message' => 'Grup pilihan berhasil diperbarui',
            'data' => $group->fresh('modifiers'),
        ]);
    }

    public function destroy(string $id)
    {
        ModifierGroup::findOrFail($id)->delete();

        return response()->json(['message' => 'Grup pilihan berhasil dihapus']);
    }

    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'min_select' => 'required|integer|min:0|max:20',
            'max_select' => 'required|integer|min:0|max:20',
            'sort_order' => 'nullable|integer|min:0',
            'modifiers' => 'required|array|min:1|max:50',
            'modifiers.*.id' => 'nullable|integer',
            'modifiers.*.name' => 'required|string|max:100',
            'modifiers.*.price_delta' => 'required|integer|min:-1000000|max:1000000',
            'modifiers.*.is_available' => 'nullable|boolean',
        ]);

        if ($validated['max_select'] > 0 && $validated['min_select'] > $validated['max_select']) {
            throw ValidationException::withMessages(['min_select' => 'Minimal pilihan tidak boleh lebih besar dari maksimal.']);
        }
        if ($validated['min_select'] > count($validated['modifiers'])) {
            throw ValidationException::withMessages(['min_select' => 'Minimal pilihan melebihi jumlah pilihan yang tersedia.']);
        }

        $validated['sort_order'] ??= 0;

        return $validated;
    }

    private function syncModifiers(ModifierGroup $group, array $modifiers): void
    {
        $keepIds = [];

        foreach (array_values($modifiers) as $index => $data) {
            $attributes = [
                'name' => $data['name'],
                'price_delta' => $data['price_delta'],
                'is_available' => $data['is_available'] ?? true,
                'sort_order' => $index,
            ];

            $modifier = ! empty($data['id']) ? $group->modifiers()->whereKey($data['id'])->first() : null;

            if ($modifier) {
                $modifier->update($attributes);
            } else {
                $modifier = $group->modifiers()->create($attributes);
            }

            $keepIds[] = $modifier->id;
        }

        $group->modifiers()->whereNotIn('id', $keepIds)->delete();
    }
}
