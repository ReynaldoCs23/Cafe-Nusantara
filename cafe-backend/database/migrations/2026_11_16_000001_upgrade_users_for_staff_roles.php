<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('customer')->change();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('pin_hash')->nullable()->after('password');
            $table->boolean('is_active')->default(true)->after('role');
        });

        // Peran lama "admin" menjadi "owner"
        DB::table('users')->where('role', 'admin')->update(['role' => 'owner']);
    }

    public function down(): void
    {
        DB::table('users')->whereIn('role', ['owner', 'manager', 'cashier', 'barista', 'waiter'])->update(['role' => 'admin']);

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['pin_hash', 'is_active']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'customer'])->default('customer')->change();
        });
    }
};
