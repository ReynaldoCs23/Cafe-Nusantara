<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;

/**
 * Promo otomatis (tanpa kode) atau voucher (dengan kode).
 * Jenis: percent (persen), amount (potongan nominal), bogo (beli X gratis Y untuk item termurah).
 */
class Promotion extends Model
{
    use Auditable;

    public const TYPES = ['percent', 'amount', 'bogo'];
    public const SCOPES = ['order', 'category', 'product'];

    protected $fillable = [
        'name', 'description', 'type', 'value', 'buy_quantity', 'get_quantity', 'max_discount',
        'scope', 'scope_ids', 'min_subtotal', 'channels', 'days', 'start_time', 'end_time',
        'starts_on', 'ends_on', 'code', 'quota', 'used_count', 'is_active',
    ];

    protected $casts = [
        'value' => 'integer',
        'buy_quantity' => 'integer',
        'get_quantity' => 'integer',
        'max_discount' => 'integer',
        'scope_ids' => 'array',
        'min_subtotal' => 'integer',
        'channels' => 'array',
        'days' => 'array',
        'starts_on' => 'date:Y-m-d',
        'ends_on' => 'date:Y-m-d',
        'quota' => 'integer',
        'used_count' => 'integer',
        'is_active' => 'boolean',
    ];

    protected $appends = ['is_voucher', 'summary'];

    public function getIsVoucherAttribute(): bool
    {
        return filled($this->code);
    }

    /** Ringkasan singkat untuk ditampilkan ke pelanggan, mis. "Diskon 20%" atau "Beli 2 gratis 1". */
    public function getSummaryAttribute(): string
    {
        return match ($this->type) {
            'percent' => "Diskon {$this->value}%" . ($this->max_discount ? ' (maks Rp' . number_format($this->max_discount, 0, ',', '.') . ')' : ''),
            'amount' => 'Potongan Rp' . number_format($this->value, 0, ',', '.'),
            'bogo' => "Beli {$this->buy_quantity} gratis {$this->get_quantity}",
            default => $this->name,
        };
    }

    public function auditPrefix(): string
    {
        return 'promotion';
    }
}
