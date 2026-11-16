<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

/**
 * Log aktivitas staf (PRD USR-03): siapa melakukan apa, kapan, dan apa yang berubah.
 * Kegagalan menulis log tidak boleh menggagalkan transaksi utama.
 */
class Audit
{
    /** Nama subjek yang mudah dibaca untuk tampilan log. */
    private const SUBJECTS = [
        \App\Models\Product::class => 'product',
        \App\Models\Category::class => 'category',
        \App\Models\ModifierGroup::class => 'modifier_group',
        \App\Models\User::class => 'user',
        \App\Models\DiningTable::class => 'table',
        \App\Models\Order::class => 'order',
        \App\Models\Shift::class => 'shift',
    ];

    public static function log(string $action, ?Model $subject = null, ?string $description = null, ?array $changes = null, ?User $user = null): void
    {
        try {
            $actor = $user ?? auth()->user();

            AuditLog::create([
                'user_id' => $actor?->id,
                'action' => $action,
                'subject_type' => $subject ? (self::SUBJECTS[$subject::class] ?? class_basename($subject)) : null,
                'subject_id' => $subject ? (string) $subject->getKey() : null,
                'description' => $description ? mb_substr($description, 0, 255) : null,
                'changes' => $changes ?: null,
                'ip' => request()?->ip(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Gagal menulis audit log', ['action' => $action, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Ringkas perubahan model: hanya kolom yang berubah, nilai lama -> baru.
     * Kolom rahasia hanya ditandai "diubah" tanpa isinya.
     */
    public static function diff(Model $model, array $ignore = []): array
    {
        $secret = ['password', 'pin_hash', 'remember_token'];
        $changes = [];

        foreach ($model->getChanges() as $key => $new) {
            if (in_array($key, ['updated_at', 'created_at', ...$ignore], true)) {
                continue;
            }
            $changes[$key] = in_array($key, $secret, true)
                ? ['from' => '••••', 'to' => '•••• (diubah)']
                : ['from' => $model->getOriginal($key), 'to' => $new];
        }

        return $changes;
    }
}
