<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        Category::create([
            'name' => 'Kopi',
            'slug' => 'kopi',
        ]);

        Category::create([
            'name' => 'Non-Kopi',
            'slug' => 'non-kopi',
        ]);

        Category::create([
            'name' => 'Makanan',
            'slug' => 'makanan',
        ]);
    }
}
