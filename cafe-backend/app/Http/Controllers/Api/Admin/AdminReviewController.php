<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\Request;

class AdminReviewController extends Controller
{
    public function index()
    {
        $reviews = Review::latest()->get();
        return response()->json(['data' => $reviews]);
    }

    public function toggleVisibility(Request $request, $id)
    {
        $request->validate([
            'is_visible' => 'required|boolean'
        ]);

        $review = Review::findOrFail($id);
        $review->update([
            'is_visible' => $request->is_visible
        ]);

        return response()->json(['message' => 'Review visibility updated', 'review' => $review]);
    }
}
