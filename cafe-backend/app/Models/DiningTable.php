<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DiningTable extends Model
{
    use Auditable;

    /** Token QR tidak ditampilkan di log; rotasi QR dicatat terpisah. */
    public array $auditIgnore = ['qr_token'];

    public function auditPrefix(): string
    {
        return 'table';
    }

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
