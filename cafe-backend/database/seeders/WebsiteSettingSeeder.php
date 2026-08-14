<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class WebsiteSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            ['key' => 'hero_title', 'value' => 'Menyeduh Ketenangan', 'type' => 'text'],
            ['key' => 'hero_subtitle', 'value' => 'Temukan harmoni dalam setiap cangkir kopi pilihan kami, dipanggang dengan penuh dedikasi.', 'type' => 'text'],
            ['key' => 'hero_image', 'value' => null, 'type' => 'image'],
            
            ['key' => 'about_1_title', 'value' => 'Akar Tradisi Kopi Nusantara', 'type' => 'text'],
            ['key' => 'about_1_subtitle', 'value' => 'Berawal dari kecintaan mendalam pada kekayaan kopi Indonesia, Brew & Bean hadir untuk merayakan setiap butir biji kopi yang tumbuh di tanah Nusantara...', 'type' => 'text'],
            ['key' => 'about_1_image', 'value' => null, 'type' => 'image'],
            
            ['key' => 'about_2_title', 'value' => 'Lokal & Segar', 'type' => 'text'],
            ['key' => 'about_2_subtitle', 'value' => 'Kami percaya bahwa kesegaran adalah kunci utama rasa. Itulah mengapa kami menyangrai biji kopi kami sendiri setiap hari.', 'type' => 'text'],
            ['key' => 'about_2_image', 'value' => null, 'type' => 'image'],
        ];

        foreach ($settings as $setting) {
            \App\Models\WebsiteSetting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value'], 'type' => $setting['type']]
            );
        }
    }
}
