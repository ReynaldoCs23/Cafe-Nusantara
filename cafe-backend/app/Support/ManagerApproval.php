<?php

namespace App\Support;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Aksi sensitif (batal pesanan lunas, refund, diskon besar) butuh manager/owner.
 * Kasir bisa melakukannya jika manager memasukkan username + PIN di perangkat kasir.
 */
class ManagerApproval
{
    public static function resolve(Request $request, User $actor): User
    {
        if ($actor->isManagerOrOwner()) {
            return $actor;
        }

        $username = (string) $request->input('approver_username');
        $pin = (string) $request->input('approver_pin');

        if ($username === '' || $pin === '') {
            throw ValidationException::withMessages(['approver_pin' => 'Aksi ini membutuhkan persetujuan PIN manager.']);
        }

        $key = 'manager-pin:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'approver_pin' => 'Terlalu banyak percobaan PIN. Coba lagi dalam ' . RateLimiter::availableIn($key) . ' detik.',
            ]);
        }

        $approver = User::where('username', $username)
            ->whereIn('role', [Role::Owner->value, Role::Manager->value])
            ->where('is_active', true)
            ->first();

        if (! $approver || ! $approver->checkPin($pin)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages(['approver_pin' => 'PIN manager tidak valid.']);
        }

        RateLimiter::clear($key);

        return $approver;
    }
}
