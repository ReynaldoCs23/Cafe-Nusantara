<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0)->after('slug');
            $table->boolean('is_active')->default(true)->after('sort_order');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->string('sku', 50)->nullable()->unique()->after('name');
            $table->string('station', 20)->default('bar')->after('price'); // bar | kitchen
            $table->boolean('track_stock')->default(true)->after('stock_quantity');
            $table->boolean('is_available')->default(true)->after('is_active'); // tombol tersedia/habis manual
            $table->unsignedInteger('sort_order')->default(0)->after('is_available');
        });

        Schema::create('modifier_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedTinyInteger('min_select')->default(0);
            $table->unsignedTinyInteger('max_select')->default(1);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('modifiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('modifier_group_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->integer('price_delta')->default(0);
            $table->boolean('is_available')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('modifier_group_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('modifier_group_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->unique(['product_id', 'modifier_group_id']);
        });

        Schema::create('dining_tables', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('area', 50)->nullable();
            $table->unsignedSmallInteger('capacity')->default(2);
            $table->string('qr_token', 64)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dining_tables');
        Schema::dropIfExists('modifier_group_product');
        Schema::dropIfExists('modifiers');
        Schema::dropIfExists('modifier_groups');

        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['sku']);
            $table->dropColumn(['sku', 'station', 'track_stock', 'is_available', 'sort_order']);
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn(['sort_order', 'is_active']);
        });
    }
};
