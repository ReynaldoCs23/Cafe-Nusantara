<?php

use App\Support\StoreSettings;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (StoreSettings::DEFAULTS as $key => $default) {
            if (! DB::table('website_settings')->where('key', $key)->exists()) {
                DB::table('website_settings')->insert([
                    'key' => $key,
                    'value' => StoreSettings::encode($default),
                    'type' => 'store',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('website_settings')->whereIn('key', array_keys(StoreSettings::DEFAULTS))->delete();
    }
};
