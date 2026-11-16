<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('device_name', 50)->nullable();
            $table->timestamp('opened_at');
            $table->integer('opening_cash')->default(0);
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('expected_cash')->nullable();
            $table->integer('counted_cash')->nullable();
            $table->integer('difference')->nullable();
            $table->json('summary')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'closed_at']);
        });

        Schema::create('cash_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained()->cascadeOnDelete();
            $table->string('type', 5); // in | out
            $table->integer('amount');
            $table->string('reason');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        foreach (['orders', 'payments', 'refunds'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (['orders', 'payments', 'refunds'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('shift_id');
            });
        }

        Schema::dropIfExists('cash_movements');
        Schema::dropIfExists('shifts');
    }
};
