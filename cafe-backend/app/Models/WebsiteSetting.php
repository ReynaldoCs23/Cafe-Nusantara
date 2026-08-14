<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebsiteSetting extends Model
{
    protected $fillable = ['key', 'value', 'type'];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute()
    {
        if ($this->type === 'image' && $this->value) {
            return url('storage/' . $this->value);
        }
        return null;
    }
}
