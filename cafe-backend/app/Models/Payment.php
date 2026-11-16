<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    public const STAFF_METHODS = ['cash', 'qris_static', 'edc'];

    protected $fillable = [
        'order_id', 'shift_id', 'method', 'provider', 'amount', 'tendered', 'change', 'reference',
        'gateway_txn_id', 'status', 'raw_payload', 'received_by', 'paid_at',
    ];

    protected $hidden = ['raw_payload'];

    protected $casts = [
        'amount' => 'integer',
        'tendered' => 'integer',
        'change' => 'integer',
        'raw_payload' => 'array',
        'paid_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
