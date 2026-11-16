<?php

namespace App\Models;

use App\Enums\Role;
use App\Models\Concerns\Auditable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'username', 'password', 'role', 'phone_number', 'is_active'])]
#[Hidden(['password', 'remember_token', 'pin_hash'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Auditable, HasApiTokens, HasFactory, Notifiable;

    public array $auditIgnore = ['remember_token', 'email_verified_at'];

    protected $appends = ['is_staff', 'has_pin'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    /** No. HP disimpan seragam (hanya angka dan +) agar pencarian member & cek duplikat akurat. */
    public static function normalizePhone(?string $phone): ?string
    {
        $clean = preg_replace('/[^\d+]/', '', (string) $phone);

        return $clean === '' ? null : $clean;
    }

    public function setPhoneNumberAttribute(?string $value): void
    {
        $this->attributes['phone_number'] = self::normalizePhone($value);
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function isStaff(): bool
    {
        return in_array($this->role, Role::staffValues(), true);
    }

    public function isManagerOrOwner(): bool
    {
        return $this->hasRole(Role::Owner->value, Role::Manager->value);
    }

    public function setPin(?string $pin): void
    {
        $this->pin_hash = $pin ? Hash::make($pin) : null;
    }

    public function checkPin(string $pin): bool
    {
        return $this->pin_hash !== null && Hash::check($pin, $this->pin_hash);
    }

    public function getIsStaffAttribute(): bool
    {
        return $this->isStaff();
    }

    public function getHasPinAttribute(): bool
    {
        return $this->pin_hash !== null;
    }
}
