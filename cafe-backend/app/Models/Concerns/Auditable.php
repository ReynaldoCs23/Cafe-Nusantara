<?php

namespace App\Models\Concerns;

use App\Support\Audit;

/**
 * Catat otomatis pembuatan, perubahan, dan penghapusan data master oleh staf.
 * Perubahan yang hanya menyentuh kolom di $auditIgnore (mis. stok terpotong karena pesanan) tidak dicatat.
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function ($model) {
            if (auth()->check()) {
                Audit::log($model->auditPrefix() . '.created', $model, $model->auditLabel());
            }
        });

        static::updated(function ($model) {
            if (! auth()->check()) {
                return;
            }
            $changes = Audit::diff($model, $model->auditIgnore ?? []);
            if ($changes) {
                Audit::log($model->auditPrefix() . '.updated', $model, $model->auditLabel(), $changes);
            }
        });

        static::deleted(function ($model) {
            if (auth()->check()) {
                Audit::log($model->auditPrefix() . '.deleted', $model, $model->auditLabel());
            }
        });
    }

    public function auditPrefix(): string
    {
        return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', class_basename($this)));
    }

    public function auditLabel(): ?string
    {
        return $this->name ?? null;
    }
}
