<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    protected $fillable = [
        'user_id', 'device_name', 'opened_at', 'opening_cash', 'closed_at', 'closed_by',
        'expected_cash', 'counted_cash', 'difference', 'summary', 'notes',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'opening_cash' => 'integer',
        'expected_cash' => 'integer',
        'counted_cash' => 'integer',
        'difference' => 'integer',
        'summary' => 'array',
    ];

    public function isOpen(): bool
    {
        return $this->closed_at === null;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function closer()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function cashMovements()
    {
        return $this->hasMany(CashMovement::class)->orderBy('id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function refunds()
    {
        return $this->hasMany(Refund::class);
    }
}
