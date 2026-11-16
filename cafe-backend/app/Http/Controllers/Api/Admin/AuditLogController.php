<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\StoreSettings;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

/** Log aktivitas staf untuk owner/manager (PRD USR-03). */
class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'user_id' => 'nullable|integer',
            'action' => 'nullable|string|max:60',
            'q' => 'nullable|string|max:100',
            'date' => 'nullable|date',
            'page' => 'nullable|integer|min:1',
        ]);

        $query = AuditLog::with('user:id,name,role')->orderByDesc('id');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('action')) {
            // Filter per kelompok, mis. "order" untuk semua aksi pesanan
            $query->where('action', 'like', $request->action . '%');
        }
        if ($request->filled('q')) {
            $query->where('description', 'like', '%' . $request->q . '%');
        }
        if ($request->filled('date')) {
            $tz = StoreSettings::get('timezone', 'Asia/Jakarta');
            $day = CarbonImmutable::parse($request->date, $tz);
            $query->whereBetween('created_at', [
                $day->startOfDay()->setTimezone(config('app.timezone')),
                $day->endOfDay()->setTimezone(config('app.timezone')),
            ]);
        }

        return response()->json($query->paginate(50));
    }
}
