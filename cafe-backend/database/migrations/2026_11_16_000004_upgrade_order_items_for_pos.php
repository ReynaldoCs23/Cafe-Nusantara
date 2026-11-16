<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->renameColumn('price_at_transaction', 'unit_price');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->json('modifiers')->nullable()->after('unit_price'); // snapshot [{group, name, price_delta}]
            $table->integer('modifiers_total')->default(0)->after('modifiers');
            $table->integer('line_total')->default(0)->after('modifiers_total');
            $table->string('notes')->nullable()->after('line_total');
            $table->string('station', 20)->default('bar')->after('notes');
            $table->string('status', 20)->default('queued')->after('station'); // queued | preparing | ready | voided
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('void_reason')->nullable();
            $table->index(['station', 'status']);
        });

        // Data lama: harga satuan sudah termasuk biaya ukuran
        DB::table('order_items')->update(['line_total' => DB::raw('unit_price * quantity')]);

        $orderStatuses = DB::table('orders')->pluck('status', 'id');
        DB::table('order_items')->get(['id', 'order_id', 'customizations'])->each(function ($item) use ($orderStatuses) {
            $orderStatus = $orderStatuses[$item->order_id] ?? 'completed';
            $itemStatus = match ($orderStatus) {
                'completed', 'ready' => 'ready',
                'preparing' => 'preparing',
                'cancelled' => 'voided',
                default => 'queued',
            };

            $modifiers = null;
            $custom = $item->customizations ? json_decode($item->customizations, true) : null;
            if (is_array($custom)) {
                $modifiers = [];
                foreach ($custom as $group => $value) {
                    if (is_scalar($value) && $value !== '') {
                        $modifiers[] = ['group' => ucfirst((string) $group), 'name' => (string) $value, 'price_delta' => 0];
                    }
                }
            }

            DB::table('order_items')->where('id', $item->id)->update([
                'status' => $itemStatus,
                'modifiers' => $modifiers ? json_encode($modifiers) : null,
            ]);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('customizations');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->json('customizations')->nullable();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['station', 'status']);
            $table->dropConstrainedForeignId('voided_by');
            $table->dropColumn([
                'modifiers', 'modifiers_total', 'line_total', 'notes', 'station', 'status',
                'started_at', 'ready_at', 'voided_at', 'void_reason',
            ]);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->renameColumn('unit_price', 'price_at_transaction');
        });
    }
};
