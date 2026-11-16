<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyTransaction extends Model
{
    protected $fillable = ['user_id', 'order_id', 'type', 'points', 'balance_after', 'note', 'created_by'];

    protected $casts = [
        'points' => 'integer',
        'balance_after' => 'integer',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
