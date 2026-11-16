<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    /** @use HasFactory<\Database\Factories\OrderItemFactory> */
    use HasFactory;

    protected $fillable = [
        'order_id', 'product_id', 'product_name', 'quantity', 'unit_price',
        'modifiers', 'modifiers_total', 'line_total', 'notes', 'station', 'status',
        'started_at', 'ready_at', 'voided_at', 'voided_by', 'void_reason',
    ];

    protected $casts = [
        'modifiers' => 'array',
        'quantity' => 'integer',
        'unit_price' => 'integer',
        'modifiers_total' => 'integer',
        'line_total' => 'integer',
        'started_at' => 'datetime',
        'ready_at' => 'datetime',
        'voided_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
