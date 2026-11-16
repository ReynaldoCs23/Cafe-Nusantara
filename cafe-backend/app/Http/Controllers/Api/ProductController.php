<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    private const MENU_RELATIONS = [
        'category:id,name,slug,sort_order',
        'modifierGroups.modifiers',
    ];

    public function index()
    {
        $products = Product::with(self::MENU_RELATIONS)
            ->where('is_active', true)
            ->whereHas('category', fn ($query) => $query->where('is_active', true))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->each(fn (Product $product) => $product->makeHidden(['stock_quantity']));

        return response()->json(['data' => $products]);
    }

    public function show(string $idOrSlug)
    {
        $product = Product::with(self::MENU_RELATIONS)
            ->where('is_active', true)
            ->whereKey((int) $idOrSlug)
            ->first();

        if (! $product) {
            return response()->json(['message' => 'Produk tidak ditemukan'], 404);
        }

        return response()->json(['data' => $product->makeHidden(['stock_quantity'])]);
    }

    public function reviews()
    {
        $reviews = Review::where('is_visible', true)
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return response()->json(['data' => $reviews]);
    }

    public function storeReview(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:100',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
        ]);

        $review = Review::create([
            ...$validated,
            'is_visible' => true,
        ]);

        return response()->json([
            'message' => 'Review submitted successfully',
            'data' => $review,
        ], 201);
    }
}
