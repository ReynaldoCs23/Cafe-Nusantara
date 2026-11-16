<?php

namespace App\Http\Controllers\Api\Pos;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\LoyaltyTransaction;
use App\Models\User;
use App\Services\LoyaltyService;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Member di kasir: cari lewat no. HP/nama, daftar cepat, dan penyesuaian poin oleh owner.
 */
class MemberController extends Controller
{
    public function search(Request $request)
    {
        $request->validate(['q' => 'required|string|min:2|max:50']);
        $q = trim($request->q);
        $digits = preg_replace('/\D/', '', $q);

        $members = User::where('role', Role::Customer->value)
            ->where('is_active', true)
            ->where(function ($query) use ($q, $digits) {
                $query->where('name', 'like', "%{$q}%");
                if (strlen($digits) >= 4) {
                    $query->orWhere('phone_number', 'like', "%{$digits}%");
                }
            })
            ->orderBy('name')
            ->limit(10)
            ->get(['id', 'name', 'phone_number', 'loyalty_points']);

        return response()->json(['data' => $members]);
    }

    /** Daftar member cepat dari kasir: cukup nama + no. HP. */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'phone_number' => ['required', 'string', 'max:20', 'regex:/^[0-9+\-\s]{8,20}$/'],
        ]);

        $phone = preg_replace('/[^\d+]/', '', $validated['phone_number']);
        if (User::where('phone_number', $phone)->exists()) {
            return response()->json([
                'message' => 'No. HP ini sudah terdaftar sebagai member.',
                'errors' => ['phone_number' => ['No. HP ini sudah terdaftar sebagai member.']],
            ], 422);
        }

        $member = User::create([
            'name' => $validated['name'],
            'phone_number' => $phone,
            'username' => 'm' . ltrim($phone, '+'),
            'password' => Hash::make(Str::random(32)),
            'role' => Role::Customer->value,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Member terdaftar',
            'data' => $member->only(['id', 'name', 'phone_number', 'loyalty_points']),
        ], 201);
    }

    /** Riwayat poin seorang member (owner/manager). */
    public function history(string $id)
    {
        $user = User::findOrFail($id);

        return response()->json(['data' => [
            'points' => $user->loyalty_points,
            'transactions' => LoyaltyTransaction::with(['order:id,order_number,queue_number', 'creator:id,name'])
                ->where('user_id', $user->id)->latest('id')->limit(100)->get(),
        ]]);
    }

    /** Penyesuaian poin manual oleh owner (mis. kompensasi, koreksi). */
    public function adjust(Request $request, string $id, LoyaltyService $loyalty)
    {
        $validated = $request->validate([
            'points' => 'required|integer|not_in:0|min:-100000|max:100000',
            'note' => 'required|string|min:3|max:255',
        ]);

        $user = User::where('role', Role::Customer->value)->findOrFail($id);
        $tx = $loyalty->adjust($user, $validated['points'], $validated['note'], $request->user());
        Audit::log('loyalty.adjusted', $user, "Poin {$user->name} " . ($tx->points >= 0 ? '+' : '') . "{$tx->points}: {$validated['note']}");

        return response()->json(['message' => 'Poin disesuaikan', 'data' => ['points' => $tx->balance_after, 'transaction' => $tx]]);
    }
}
