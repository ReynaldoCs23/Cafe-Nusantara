<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\WebsiteContent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AdminContentController extends Controller
{
    public function index()
    {
        $contents = WebsiteContent::where('is_active', true)->orderBy('sort_order', 'asc')->get();
        return response()->json(['data' => $contents], 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'section_name' => 'nullable|string|max:255',
            'title' => 'nullable|string|max:255',
            'body' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'sort_order' => 'nullable|integer',
        ]);

        $data = $request->only(['section_name', 'title', 'body', 'sort_order']);
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['is_active'] = $request->has('is_active') ? filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN) : true;
        $data['show_on_home'] = $request->has('show_on_home') ? filter_var($request->show_on_home, FILTER_VALIDATE_BOOLEAN) : false;

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('content', 'public');
        }

        $content = WebsiteContent::create($data);

        return response()->json([
            'message' => 'Content created successfully',
            'data' => $content
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $content = WebsiteContent::findOrFail($id);

        $request->validate([
            'section_name' => 'nullable|string|max:255',
            'title' => 'nullable|string|max:255',
            'body' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'sort_order' => 'nullable|integer',
        ]);

        $data = $request->only(['section_name', 'title', 'body', 'sort_order']);
        if ($request->has('is_active')) {
            $data['is_active'] = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('show_on_home')) {
            $data['show_on_home'] = filter_var($request->show_on_home, FILTER_VALIDATE_BOOLEAN);
        }
        
        if ($request->hasFile('image')) {
            if ($content->image_path) {
                Storage::disk('public')->delete($content->image_path);
            }
            $data['image_path'] = $request->file('image')->store('content', 'public');
        }

        $content->update($data);

        return response()->json([
            'message' => 'Content updated successfully',
            'data' => $content
        ], 200);
    }

    public function destroy($id)
    {
        $content = WebsiteContent::findOrFail($id);
        if ($content->image_path) {
            Storage::disk('public')->delete($content->image_path);
        }
        $content->delete();

        return response()->json([
            'message' => 'Content deleted successfully'
        ], 200);
    }
}
