<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Modifier extends Model
{
    protected $fillable = ['modifier_group_id', 'name', 'price_delta', 'is_available', 'sort_order'];

    protected $casts = [
        'price_delta' => 'integer',
        'is_available' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function group()
    {
        return $this->belongsTo(ModifierGroup::class, 'modifier_group_id');
    }
}
