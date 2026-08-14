<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::with('category')
            ->where('is_active', true)
            ->get();
            
        return response()->json([
            'data' => $products
        ], 200);
    }

    public function show($id)
    {
        $product = Product::with(['category', 'reviews'])
            ->where('is_active', true)
            ->find($id);

        if (!$product) {
            return response()->json([
                'message' => 'Produk tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'data' => $product
        ], 200);
    }

    public function reviews()
    {
        try {
            $reviews = \App\Models\Review::where('is_visible', true)
                ->orderBy('created_at', 'desc')
                ->get();
                
            return response()->json([
                'data' => $reviews
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false, 
                'message' => $e->getMessage(), 
                'file' => $e->getFile(), 
                'line' => $e->getLine()
            ], 500);
        }
    }

    public function storeReview(\Illuminate\Http\Request $request)
    {
        try {
            $validated = $request->validate([
                'customer_name' => 'required|string|max:255',
                'rating' => 'required|integer|min:1|max:5',
                'comment' => 'required|string',
            ]);

            $review = \App\Models\Review::create([
                'customer_name' => $validated['customer_name'],
                'rating' => $validated['rating'],
                'comment' => $validated['comment'],
                'is_visible' => true, 
            ]);

            return response()->json([
                'message' => 'Review submitted successfully',
                'data' => $review
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false, 
                'message' => $e->getMessage(), 
                'file' => $e->getFile(), 
                'line' => $e->getLine()
            ], 500);
        }
    }
}
