<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 4: log aktivitas (USR-03), diskon manual (PRM-01), refund sebagian per item (RFD-03).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 60);
            $table->string('subject_type', 60)->nullable();
            $table->string('subject_id', 64)->nullable();
            $table->string('description')->nullable();
            $table->json('changes')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['subject_type', 'subject_id']);
            $table->index('action');
            $table->index('created_at');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('discount_type', 10)->nullable()->after('discount_total'); // percent | amount
            $table->integer('discount_value')->nullable()->after('discount_type');
            $table->string('discount_reason')->nullable()->after('discount_value');
            $table->foreignId('discount_by')->nullable()->after('discount_reason')->constrained('users')->nullOnDelete();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedInteger('refunded_quantity')->default(0)->after('quantity');
        });

        Schema::table('refunds', function (Blueprint $table) {
            $table->json('items')->nullable()->after('amount');
            $table->boolean('restocked')->default(false)->after('items');
        });
    }

    public function down(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->dropColumn(['items', 'restocked']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('refunded_quantity');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('discount_by');
            $table->dropColumn(['discount_type', 'discount_value', 'discount_reason']);
        });

        Schema::dropIfExists('audit_logs');
    }
};
