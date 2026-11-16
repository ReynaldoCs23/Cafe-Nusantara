<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderStatusLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['order_id', 'from', 'to', 'user_id', 'reason'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
