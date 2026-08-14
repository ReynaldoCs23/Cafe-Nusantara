<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        Product::create([
            'category_id' => 1,
            'name' => 'Es Kopi Susu Gula Aren',
            'description' => 'Perpaduan espresso lokal dengan susu segar dan gula aren asli.',
            'price' => 25000,
            'stock_quantity' => 50,
            'is_active' => true,
        ]);

        Product::create([
            'category_id' => 1,
            'name' => 'Americano Toraja',
            'description' => 'Kopi hitam pekat dari biji Toraja pilihan.',
            'price' => 20000,
            'stock_quantity' => 100,
            'is_active' => true,
        ]);

        Product::create([
            'category_id' => 2,
            'name' => 'Matcha Latte',
            'description' => 'Bubuk matcha premium Jepang yang diseduh dengan susu segar.',
            'price' => 35000,
            'stock_quantity' => 40,
            'is_active' => true,
        ]);

        Product::create([
            'category_id' => 3,
            'name' => 'Croissant Mentega',
            'description' => 'Pastry hangat berlapis mentega khas Prancis.',
            'price' => 28000,
            'stock_quantity' => 20,
            'is_active' => true,
        ]);

        Product::create([
            'category_id' => 3,
            'name' => 'Chicken Katsu Sandwich',
            'description' => 'Roti lapis gurih dengan potongan ayam katsu bergaya Jepang.',
            'price' => 35000,
            'stock_quantity' => 15,
            'is_active' => true,
        ]);
    }
}
