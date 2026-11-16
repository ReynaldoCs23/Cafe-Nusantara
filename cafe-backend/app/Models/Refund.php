<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    protected $fillable = ['order_id', 'shift_id', 'payment_id', 'amount', 'method', 'reason', 'approved_by', 'created_by'];

    protected $casts = [
        'amount' => 'integer',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
