<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    /** @use HasFactory<\Database\Factories\ProductFactory> */
    use Auditable, HasFactory;

    /** Stok terpotong otomatis oleh pesanan tidak dicatat; koreksi stok manual dicatat terpisah. */
    public array $auditIgnore = ['stock_quantity'];

    public const STATIONS = ['bar', 'kitchen'];

    protected $fillable = [
        'category_id', 'name', 'sku', 'description', 'price', 'station',
        'stock_quantity', 'track_stock', 'image_path',
        'is_active', 'is_available', 'is_recommended', 'sort_order',
    ];

    protected $casts = [
        'price' => 'integer',
        'stock_quantity' => 'integer',
        'track_stock' => 'boolean',
        'is_active' => 'boolean',
        'is_available' => 'boolean',
        'is_recommended' => 'boolean',
    ];

    protected $appends = ['image_url', 'is_sold_out'];

    public function getImageUrlAttribute()
    {
        return $this->image_path ? url('storage/' . $this->image_path) : null;
    }

    /** Habis jika ditandai manual, atau stok tercatat sudah 0. */
    public function getIsSoldOutAttribute(): bool
    {
        return ! $this->is_available || ($this->track_stock && $this->stock_quantity <= 0);
    }

    public function canFulfill(int $quantity): bool
    {
        return $this->is_active
            && $this->is_available
            && (! $this->track_stock || $this->stock_quantity >= $quantity);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function modifierGroups()
    {
        return $this->belongsToMany(ModifierGroup::class)
            ->withPivot('sort_order')
            ->orderByPivot('sort_order');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }
}
