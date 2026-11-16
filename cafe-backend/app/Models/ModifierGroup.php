<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;

/**
 * Grup pilihan yang bisa dipakai ulang, misalnya Ukuran (wajib, pilih 1),
 * Gula (wajib, pilih 1), atau Tambahan (opsional, pilih banyak).
 */
class ModifierGroup extends Model
{
    use Auditable;

    protected $fillable = ['name', 'min_select', 'max_select', 'sort_order'];

    protected $casts = [
        'min_select' => 'integer',
        'max_select' => 'integer',
        'sort_order' => 'integer',
    ];

    protected $appends = ['is_required'];

    public function getIsRequiredAttribute(): bool
    {
        return $this->min_select > 0;
    }

    public function modifiers()
    {
        return $this->hasMany(Modifier::class)->orderBy('sort_order')->orderBy('id');
    }

    public function products()
    {
        return $this->belongsToMany(Product::class);
    }
}
