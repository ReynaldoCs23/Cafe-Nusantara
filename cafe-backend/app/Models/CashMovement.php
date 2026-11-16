<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashMovement extends Model
{
    protected $fillable = ['shift_id', 'type', 'amount', 'reason', 'user_id'];

    protected $casts = ['amount' => 'integer'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
