<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\Product;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Support\Str;

class DummyStoreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Ensure Categories Exist
        $coffeeCategory = Category::firstOrCreate(['name' => 'Kopi', 'slug' => 'kopi']);
        $nonCoffeeCategory = Category::firstOrCreate(['name' => 'Non-Kopi', 'slug' => 'non-kopi']);
        $foodCategory = Category::firstOrCreate(['name' => 'Makanan', 'slug' => 'makanan']);

        // 2. Create 3 Dummy Products
        $productCoffee = Product::firstOrCreate(
            ['name' => 'Premium Cappuccino'],
            [
                'category_id' => $coffeeCategory->id,
                'description' => 'Rich espresso layered with frothed milk.',
                'price' => 35000,
                'stock_quantity' => 100,
                'is_active' => true,
            ]
        );

        $productNonCoffee = Product::firstOrCreate(
            ['name' => 'Matcha Latte'],
            [
                'category_id' => $nonCoffeeCategory->id,
                'description' => 'Premium Japanese matcha with fresh milk.',
                'price' => 38000,
                'stock_quantity' => 100,
                'is_active' => true,
            ]
        );

        $productFood = Product::firstOrCreate(
            ['name' => 'Butter Croissant'],
            [
                'category_id' => $foodCategory->id,
                'description' => 'Freshly baked flaky butter croissant.',
                'price' => 25000,
                'stock_quantity' => 100,
                'is_active' => true,
            ]
        );

        // Get a dummy customer user if exists
        $user = User::where('role', 'customer')->first();

        // 3. Create 5 Dummy Orders
        $statuses = ['pending', 'processing', 'completed', 'paid', 'completed'];

        for ($i = 0; $i < 5; $i++) {
            $status = $statuses[$i];
            
            // Randomly select 1 to 3 items for this order
            $items = collect([$productCoffee, $productNonCoffee, $productFood])->random(rand(1, 3));
            
            $subtotal = 0;
            $orderItems = [];

            foreach ($items as $item) {
                $quantity = rand(1, 3);
                $subtotal += $item->price * $quantity;
                
                $orderItems[] = [
                    'product_id' => $item->id,
                    'product_name' => $item->name,
                    'quantity' => $quantity,
                    'price_at_transaction' => $item->price,
                    'created_at' => now()->subDays(rand(0, 5)),
                    'updated_at' => now()->subDays(rand(0, 5)),
                ];
            }

            $tax_amount = intval($subtotal * 0.11);
            $grand_total = $subtotal + $tax_amount;

            $order = Order::create([
                'id' => (string) Str::uuid(),
                'user_id' => $user ? $user->id : null,
                'order_number' => 'ORD-' . time() . '-' . strtoupper(Str::random(4)),
                'subtotal' => $subtotal,
                'tax_amount' => $tax_amount,
                'grand_total' => $grand_total,
                'status' => $status,
                'created_at' => now()->subDays(rand(0, 5)),
                'updated_at' => now()->subDays(rand(0, 5)),
            ]);

            foreach ($orderItems as &$orderItem) {
                $orderItem['order_id'] = $order->id;
            }

            OrderItem::insert($orderItems);
            
            // Small delay to ensure unique order numbers if time() is used
            sleep(1); 
        }

        $this->command->info('DummyStoreSeeder has successfully generated 3 Products and 5 Orders!');
    }
}
