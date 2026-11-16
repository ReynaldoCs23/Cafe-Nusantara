<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasUuids;
    /** @use HasFactory<\Database\Factories\OrderFactory> */
    use HasFactory;

    public const CHANNELS = ['pos', 'qr', 'online'];
    public const FULFILLMENTS = ['pickup', 'table'];

    protected $fillable = [
        'user_id', 'created_by', 'shift_id', 'order_number', 'channel', 'fulfillment', 'dining_table_id',
        'customer_name', 'customer_phone', 'queue_number',
        'subtotal', 'discount_total', 'discount_type', 'discount_value', 'discount_reason', 'discount_by', 'service_charge', 'tax_amount', 'rounding', 'grand_total',
        'status', 'payment_status', 'remarks', 'notes', 'access_token', 'idempotency_key',
        'pickup_at', 'payment_due_at', 'paid_at', 'ready_at', 'completed_at', 'cancelled_at', 'cancel_reason',
    ];

    protected $hidden = ['access_token', 'idempotency_key'];

    protected $appends = ['status_label'];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'payment_status' => PaymentStatus::class,
            'subtotal' => 'integer',
            'discount_total' => 'integer',
            'service_charge' => 'integer',
            'tax_amount' => 'integer',
            'rounding' => 'integer',
            'grand_total' => 'integer',
            'queue_number' => 'integer',
            'pickup_at' => 'datetime',
            'payment_due_at' => 'datetime',
            'paid_at' => 'datetime',
            'ready_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function getStatusLabelAttribute(): ?string
    {
        return $this->status?->label();
    }

    public function amountPaid(): int
    {
        return (int) $this->payments()->where('status', 'paid')->sum('amount');
    }

    public function amountRefunded(): int
    {
        return (int) $this->refunds()->sum('amount');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function refunds()
    {
        return $this->hasMany(Refund::class);
    }

    public function statusLogs()
    {
        return $this->hasMany(OrderStatusLog::class)->orderBy('id');
    }

    public function diningTable()
    {
        return $this->belongsTo(DiningTable::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
