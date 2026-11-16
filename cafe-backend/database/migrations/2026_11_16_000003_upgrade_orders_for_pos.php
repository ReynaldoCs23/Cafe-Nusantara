<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Status bebas (enum) menjadi string agar mengikuti state machine di aplikasi
        Schema::table('orders', function (Blueprint $table) {
            $table->string('status', 30)->default('pending_payment')->change();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_status', 30)->default('unpaid')->after('status');
            $table->string('channel', 10)->default('online')->after('order_number'); // pos | qr | online
            $table->string('fulfillment', 10)->default('pickup')->after('channel'); // pickup | table
            $table->foreignId('dining_table_id')->nullable()->after('fulfillment')->constrained('dining_tables')->nullOnDelete();
            $table->string('customer_name')->nullable()->after('dining_table_id');
            $table->string('customer_phone', 20)->nullable()->after('customer_name');
            $table->unsignedInteger('queue_number')->nullable()->after('customer_phone');
            $table->integer('discount_total')->default(0)->after('subtotal');
            $table->integer('service_charge')->default(0)->after('discount_total');
            $table->integer('rounding')->default(0)->after('tax_amount');
            $table->text('notes')->nullable()->after('grand_total');
            $table->string('access_token', 64)->nullable()->unique()->after('notes');
            $table->string('idempotency_key', 100)->nullable()->unique()->after('access_token');
            $table->foreignId('created_by')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            $table->timestamp('pickup_at')->nullable();
            $table->timestamp('payment_due_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->index(['status', 'created_at']);
            $table->index(['payment_status', 'paid_at']);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('method', 20); // cash | qris_static | edc | gateway | legacy
            $table->string('provider', 30)->nullable(); // midtrans
            $table->integer('amount');
            $table->integer('tendered')->nullable();
            $table->integer('change')->nullable();
            $table->string('reference', 100)->nullable();
            $table->string('gateway_txn_id', 100)->nullable()->unique();
            $table->string('status', 20)->default('paid'); // pending | paid | failed
            $table->json('raw_payload')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'paid_at']);
        });

        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->integer('amount');
            $table->string('method', 20);
            $table->string('reason');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('order_status_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('from', 30)->nullable();
            $table->string('to', 30);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason')->nullable();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('daily_counters', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('name', 30);
            $table->unsignedInteger('value')->default(0);
            $table->unique(['date', 'name']);
        });

        // 2. Migrasi data lama
        $map = [
            'pending' => ['cancelled', 'unpaid'], // pesanan belum bayar dari masa lalu sudah tidak relevan
            'paid' => ['queued', 'paid'],
            'processing' => ['preparing', 'paid'],
            'completed' => ['completed', 'paid'],
            'selesai' => ['completed', 'paid'],
            'cancelled' => ['cancelled', 'unpaid'],
        ];

        DB::table('orders')->orderBy('created_at')->get()->each(function ($order) use ($map) {
            [$status, $paymentStatus] = $map[$order->status] ?? ['cancelled', 'unpaid'];

            $customerName = null;
            if ($order->user_id) {
                $customerName = DB::table('users')->where('id', $order->user_id)->value('name');
            }

            DB::table('orders')->where('id', $order->id)->update([
                'status' => $status,
                'payment_status' => $paymentStatus,
                'customer_name' => $customerName ?? 'Tamu',
                'access_token' => Str::random(40),
                'paid_at' => $paymentStatus === 'paid' ? $order->updated_at : null,
                'completed_at' => $status === 'completed' ? $order->updated_at : null,
                'cancelled_at' => $status === 'cancelled' ? $order->updated_at : null,
                'cancel_reason' => $status === 'cancelled' ? ($order->remarks ?? 'Migrasi data lama') : null,
            ]);

            if ($paymentStatus === 'paid') {
                DB::table('payments')->insert([
                    'order_id' => $order->id,
                    'method' => 'legacy',
                    'reference' => $order->payment_type,
                    'amount' => $order->grand_total,
                    'status' => 'paid',
                    'paid_at' => $order->updated_at,
                    'created_at' => $order->updated_at,
                    'updated_at' => $order->updated_at,
                ]);
            }
        });

        // 3. Kolom lama yang digantikan tabel payments & integrasi Moka yang dihentikan
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['payment_type', 'moka_transaction_id']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_type')->nullable();
            $table->string('moka_transaction_id')->nullable();
        });

        $map = [
            'pending_payment' => 'pending',
            'queued' => 'paid',
            'preparing' => 'processing',
            'ready' => 'processing',
            'completed' => 'completed',
            'cancelled' => 'cancelled',
        ];
        foreach ($map as $new => $old) {
            DB::table('orders')->where('status', $new)->update(['status' => $old]);
        }

        Schema::dropIfExists('daily_counters');
        Schema::dropIfExists('order_status_logs');
        Schema::dropIfExists('refunds');
        Schema::dropIfExists('payments');

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
            $table->dropIndex(['payment_status', 'paid_at']);
            $table->dropConstrainedForeignId('dining_table_id');
            $table->dropConstrainedForeignId('created_by');
            $table->dropUnique(['access_token']);
            $table->dropUnique(['idempotency_key']);
            $table->dropColumn([
                'payment_status', 'channel', 'fulfillment', 'customer_name', 'customer_phone', 'queue_number',
                'discount_total', 'service_charge', 'rounding', 'notes', 'access_token', 'idempotency_key',
                'pickup_at', 'payment_due_at', 'paid_at', 'ready_at', 'completed_at', 'cancelled_at', 'cancel_reason',
            ]);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->enum('status', ['pending', 'paid', 'processing', 'completed', 'cancelled'])->default('pending')->change();
        });
    }
};
