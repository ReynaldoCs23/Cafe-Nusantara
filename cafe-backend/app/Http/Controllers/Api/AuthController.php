<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => Role::Customer->value,
        ]);

        return response()->json([
            'access_token' => $this->issueToken($user, $request),
            'token_type' => 'Bearer',
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt($credentials)) {
            return response()->json(['message' => 'Kredensial tidak valid'], 401);
        }

        /** @var User $user */
        $user = Auth::user();

        if (! $user->is_active) {
            return response()->json(['message' => 'Akun ini dinonaktifkan. Hubungi owner.'], 403);
        }

        return response()->json([
            'access_token' => $this->issueToken($user, $request),
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    /**
     * Ganti pengguna cepat di perangkat bersama (tablet kasir / KDS) memakai PIN.
     */
    public function pinLogin(Request $request)
    {
        $validated = $request->validate([
            'username' => 'required|string',
            'pin' => 'required|digits_between:4,6',
        ]);

        $key = 'pin-login:' . strtolower($validated['username']) . '|' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                'message' => 'Terlalu banyak percobaan PIN. Coba lagi dalam ' . RateLimiter::availableIn($key) . ' detik.',
            ], 429);
        }

        $user = User::where('username', $validated['username'])
            ->whereIn('role', Role::staffValues())
            ->first();

        if (! $user || ! $user->is_active || ! $user->checkPin($validated['pin'])) {
            RateLimiter::hit($key, 300);

            return response()->json(['message' => 'Username atau PIN salah'], 401);
        }

        RateLimiter::clear($key);

        return response()->json([
            'access_token' => $this->issueToken($user, $request),
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Berhasil logout']);
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $request->user()]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8|confirmed',
            'phone_number' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s]{8,20}$/'],
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        if (array_key_exists('phone_number', $validated)) {
            $user->phone_number = $validated['phone_number'];
        }
        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }
        $user->save();

        return response()->json([
            'message' => 'Profil berhasil diperbarui',
            'user' => $user,
        ]);
    }

    /**
     * Satu token per perangkat: login ulang di perangkat yang sama mengganti token lamanya,
     * tanpa mengeluarkan perangkat lain (misalnya tablet KDS tetap login).
     */
    private function issueToken(User $user, Request $request): string
    {
        $device = substr(preg_replace('/[^A-Za-z0-9 _\-]/', '', (string) $request->input('device_name', 'web')) ?: 'web', 0, 50);

        $user->tokens()->where('name', $device)->delete();

        return $user->createToken($device)->plainTextToken;
    }
}
