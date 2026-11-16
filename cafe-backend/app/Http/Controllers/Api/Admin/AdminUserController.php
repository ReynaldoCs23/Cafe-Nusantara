<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index()
    {
        return response()->json(['data' => User::orderBy('name')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'nullable|string|max:50|alpha_dash|unique:users,username',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => ['required', Rule::in(Role::values())],
            'pin' => 'nullable|digits_between:4,6',
            'phone_number' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
        ]);

        $user = new User([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'username' => $validated['username'] ?? $this->generateUsername($validated['name']),
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'phone_number' => $validated['phone_number'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);
        $user->setPin($validated['pin'] ?? null);
        $user->save();

        return response()->json(['message' => 'Pengguna berhasil dibuat', 'data' => $user], 201);
    }

    public function show(string $id)
    {
        return response()->json(['data' => User::findOrFail($id)]);
    }

    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'username' => ['sometimes', 'required', 'string', 'max:50', 'alpha_dash', Rule::unique('users', 'username')->ignore($user->id)],
            'email' => ['sometimes', 'required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => 'nullable|string|min:8',
            'role' => ['sometimes', 'required', Rule::in(Role::values())],
            'pin' => 'nullable|digits_between:4,6',
            'remove_pin' => 'nullable|boolean',
            'phone_number' => 'nullable|string|max:20',
            'is_active' => 'sometimes|required|boolean',
        ]);

        $losesOwner = $user->role === Role::Owner->value && (
            (isset($validated['role']) && $validated['role'] !== Role::Owner->value)
            || (isset($validated['is_active']) && ! $validated['is_active'])
        );
        if ($losesOwner && $this->activeOwnerCount() <= 1) {
            return response()->json(['message' => 'Minimal harus ada satu owner aktif.'], 422);
        }

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }
        if (! empty($validated['pin'])) {
            $user->setPin($validated['pin']);
        } elseif (! empty($validated['remove_pin'])) {
            $user->setPin(null);
        }

        $user->fill(collect($validated)->except(['password', 'pin', 'remove_pin'])->all());
        $user->save();

        if (array_key_exists('is_active', $validated) && ! $user->is_active) {
            $user->tokens()->delete(); // keluarkan dari semua perangkat
        }

        return response()->json(['message' => 'Pengguna berhasil diperbarui', 'data' => $user]);
    }

    public function destroy(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Anda tidak bisa menghapus akun sendiri.'], 422);
        }
        if ($user->role === Role::Owner->value && $this->activeOwnerCount() <= 1) {
            return response()->json(['message' => 'Minimal harus ada satu owner aktif.'], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Pengguna berhasil dihapus']);
    }

    private function activeOwnerCount(): int
    {
        return User::where('role', Role::Owner->value)->where('is_active', true)->count();
    }

    private function generateUsername(string $name): string
    {
        $base = Str::slug($name, '') ?: 'user';
        $username = $base;
        $counter = 1;
        while (User::where('username', $username)->exists()) {
            $username = $base . $counter++;
        }

        return $username;
    }
}
