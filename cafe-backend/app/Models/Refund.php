<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    protected $fillable = ['order_id', 'shift_id', 'payment_id', 'amount', 'items', 'restocked', 'method', 'reason', 'approved_by', 'created_by'];

    protected $casts = [
        'amount' => 'integer',
        'items' => 'array',
        'restocked' => 'boolean',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
