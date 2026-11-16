<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminProductController extends Controller
{
    public function index()
    {
        $products = Product::with(['category', 'modifierGroups:id,name'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $products]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        if ($request->hasFile('image')) {
            $validated['image_path'] = $request->file('image')->store('products', 'public');
        }

        $product = Product::create($this->defaults($validated));
        $this->syncModifierGroups($request, $product);

        return response()->json([
            'message' => 'Produk berhasil ditambahkan',
            'data' => $product->load('category', 'modifierGroups:id,name'),
        ], 201);
    }

    public function show(string $id)
    {
        return response()->json([
            'data' => Product::with(['category', 'modifierGroups.modifiers'])->findOrFail($id),
        ]);
    }

    public function update(Request $request, string $id)
    {
        $product = Product::findOrFail($id);
        $validated = $request->validate($this->rules($product));

        if ($request->hasFile('image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('products', 'public');
        }

        unset($validated['image'], $validated['modifier_group_ids']);
        $stockBefore = $product->stock_quantity;
        $product->update($validated);
        $this->logStockAdjustment($product, $stockBefore);
        $this->syncModifierGroups($request, $product);

        return response()->json([
            'message' => 'Produk berhasil diperbarui',
            'data' => $product->load('category', 'modifierGroups:id,name'),
        ]);
    }

    /** Tombol cepat tersedia/habis dan koreksi stok dari POS/KDS. */
    public function availability(Request $request, string $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'is_available' => 'sometimes|required|boolean',
            'stock_quantity' => 'sometimes|required|integer|min:0|max:100000',
        ]);

        $stockBefore = $product->stock_quantity;
        $product->update($validated);
        $this->logStockAdjustment($product, $stockBefore);

        return response()->json([
            'message' => $product->is_sold_out ? "{$product->name} ditandai habis" : "{$product->name} tersedia",
            'data' => $product,
        ]);
    }

    public function destroy(string $id)
    {
        $product = Product::findOrFail($id);
        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }
        $product->delete();

        return response()->json(['message' => 'Produk berhasil dihapus']);
    }

    /** Koreksi stok manual dicatat di log aktivitas (pemotongan stok oleh pesanan tidak). */
    private function logStockAdjustment(Product $product, int $before): void
    {
        if ($product->stock_quantity !== $before) {
            Audit::log('product.stock_adjusted', $product, "{$product->name}: stok {$before} → {$product->stock_quantity}", [
                'stock_quantity' => ['from' => $before, 'to' => $product->stock_quantity],
            ]);
        }
    }

    private function rules(?Product $product = null): array
    {
        $required = $product ? 'sometimes|required' : 'required';

        return [
            'category_id' => "{$required}|exists:categories,id",
            'name' => "{$required}|string|max:255",
            'sku' => ['nullable', 'string', 'max:50', Rule::unique('products', 'sku')->ignore($product?->id)],
            'price' => "{$required}|integer|min:0",
            'station' => ['sometimes', 'required', Rule::in(Product::STATIONS)],
            'stock_quantity' => 'sometimes|required|integer|min:0|max:100000',
            'track_stock' => 'sometimes|required|boolean',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|required|boolean',
            'is_available' => 'sometimes|required|boolean',
            'is_recommended' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'modifier_group_ids' => 'nullable|array',
            'modifier_group_ids.*' => 'integer|exists:modifier_groups,id',
        ];
    }

    private function defaults(array $validated): array
    {
        unset($validated['image'], $validated['modifier_group_ids']);

        return array_merge([
            'station' => 'bar',
            'stock_quantity' => 0,
            'track_stock' => true,
            'is_active' => true,
            'is_available' => true,
            'is_recommended' => false,
            'sort_order' => 0,
        ], array_filter($validated, fn ($value) => $value !== null));
    }

    /**
     * Sinkron grup modifier jika field dikirim. Kirim modifier_group_ids kosong ("")
     * untuk melepas semua grup.
     */
    private function syncModifierGroups(Request $request, Product $product): void
    {
        if (! $request->exists('modifier_group_ids')) {
            return;
        }

        $ids = array_values(array_filter((array) $request->input('modifier_group_ids'), fn ($id) => filled($id)));
        $sync = [];
        foreach ($ids as $index => $id) {
            $sync[(int) $id] = ['sort_order' => $index];
        }

        $product->modifierGroups()->sync($sync);
    }
}
