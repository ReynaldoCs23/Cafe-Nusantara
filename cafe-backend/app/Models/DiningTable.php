<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DiningTable extends Model
{
    protected $fillable = ['name', 'area', 'capacity', 'qr_token', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
        'capacity' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (DiningTable $table) {
            $table->qr_token ??= self::newToken();
        });
    }

    public static function newToken(): string
    {
        return Str::random(32);
    }
}
