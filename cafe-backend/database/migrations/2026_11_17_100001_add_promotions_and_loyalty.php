<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 5: promo terjadwal & voucher (PRM-02/03), member & poin loyalty.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('type', 10); // percent | amount | bogo
            $table->unsignedInteger('value')->default(0); // persen atau nominal
            $table->unsignedSmallInteger('buy_quantity')->nullable(); // beli X ...
            $table->unsignedSmallInteger('get_quantity')->nullable(); // ... gratis Y
            $table->unsignedInteger('max_discount')->nullable(); // batas potongan untuk persen
            $table->string('scope', 10)->default('order'); // order | category | product
            $table->json('scope_ids')->nullable();
            $table->unsignedInteger('min_subtotal')->default(0);
            $table->json('channels')->nullable(); // null = semua kanal
            $table->json('days')->nullable(); // null = setiap hari
            $table->string('start_time', 5)->nullable(); // HH:MM (happy hour)
            $table->string('end_time', 5)->nullable();
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->string('code', 40)->nullable()->unique(); // diisi = voucher, kosong = promo otomatis
            $table->unsignedInteger('quota')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->integer('manual_discount')->default(0)->after('discount_total');
            $table->foreignId('promotion_id')->nullable()->after('manual_discount')->constrained('promotions')->nullOnDelete();
            $table->string('promotion_name')->nullable()->after('promotion_id');
            $table->string('voucher_code', 40)->nullable()->after('promotion_name');
            $table->integer('promo_discount')->default(0)->after('voucher_code');
            $table->integer('points_redeemed')->default(0)->after('promo_discount');
            $table->integer('points_discount')->default(0)->after('points_redeemed');
            $table->integer('points_earned')->default(0)->after('points_discount');
        });

        // Diskon lama seluruhnya diskon manual
        DB::table('orders')->update(['manual_discount' => DB::raw('discount_total')]);

        Schema::table('users', function (Blueprint $table) {
            $table->integer('loyalty_points')->default(0)->after('phone_number');
            $table->string('email')->nullable()->change(); // member yang didaftarkan kasir cukup nama + no. HP
            $table->unique('phone_number');
        });

        Schema::create('loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('type', 10); // earn | redeem | revert | refund | adjust
            $table->integer('points');
            $table->integer('balance_after');
            $table->string('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_transactions');

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone_number']);
            $table->dropColumn('loyalty_points');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('promotion_id');
            $table->dropColumn(['manual_discount', 'promotion_name', 'voucher_code', 'promo_discount', 'points_redeemed', 'points_discount', 'points_earned']);
        });

        Schema::dropIfExists('promotions');
    }
};
