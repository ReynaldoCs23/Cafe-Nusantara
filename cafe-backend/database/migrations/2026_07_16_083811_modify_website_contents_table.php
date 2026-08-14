<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('website_contents', function (Blueprint $table) {
            $table->dropColumn('key');
            $table->dropColumn('value');
            
            $table->string('title')->nullable();
            $table->text('body_text')->nullable();
            $table->string('image_path')->nullable();
            $table->integer('sort_order')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('website_contents', function (Blueprint $table) {
            $table->string('key')->unique();
            $table->text('value')->nullable();
            
            $table->dropColumn(['title', 'body_text', 'image_path', 'sort_order']);
        });
    }
};
