<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Memindahkan pilihan yang sebelumnya di-hardcode di frontend (Ukuran +5000, Es, Gula)
 * menjadi data modifier, lalu memasangnya ke produk kategori Kopi/Non-Kopi.
 * Produk kategori Makanan diarahkan ke stasiun dapur.
 */
return new class extends Migration
{
    private const GROUPS = [
        ['name' => 'Ukuran', 'options' => [['Regular', 0], ['Large', 5000]]],
        ['name' => 'Es', 'options' => [['Normal', 0], ['Less Ice', 0], ['No Ice', 0]]],
        ['name' => 'Gula', 'options' => [['Normal', 0], ['Less Sugar', 0], ['No Sugar', 0]]],
    ];

    public function up(): void
    {
        $now = now();
        $groupIds = [];

        foreach (self::GROUPS as $index => $group) {
            $existing = DB::table('modifier_groups')->where('name', $group['name'])->value('id');
            if ($existing) {
                $groupIds[] = $existing;

                continue;
            }

            $groupId = DB::table('modifier_groups')->insertGetId([
                'name' => $group['name'],
                'min_select' => 1,
                'max_select' => 1,
                'sort_order' => $index,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach ($group['options'] as $order => [$name, $price]) {
                DB::table('modifiers')->insert([
                    'modifier_group_id' => $groupId,
                    'name' => $name,
                    'price_delta' => $price,
                    'is_available' => true,
                    'sort_order' => $order,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $groupIds[] = $groupId;
        }

        $drinkCategoryIds = DB::table('categories')
            ->whereIn(DB::raw('LOWER(name)'), ['kopi', 'non-kopi'])
            ->pluck('id');

        $drinkProductIds = DB::table('products')->whereIn('category_id', $drinkCategoryIds)->pluck('id');

        foreach ($drinkProductIds as $productId) {
            foreach ($groupIds as $order => $groupId) {
                DB::table('modifier_group_product')->insertOrIgnore([
                    'product_id' => $productId,
                    'modifier_group_id' => $groupId,
                    'sort_order' => $order,
                ]);
            }
        }

        $foodCategoryIds = DB::table('categories')->whereIn(DB::raw('LOWER(name)'), ['makanan'])->pluck('id');
        DB::table('products')->whereIn('category_id', $foodCategoryIds)->update(['station' => 'kitchen']);
    }

    public function down(): void
    {
        $groupIds = DB::table('modifier_groups')->whereIn('name', array_column(self::GROUPS, 'name'))->pluck('id');
        DB::table('modifier_group_product')->whereIn('modifier_group_id', $groupIds)->delete();
        DB::table('modifiers')->whereIn('modifier_group_id', $groupIds)->delete();
        DB::table('modifier_groups')->whereIn('id', $groupIds)->delete();
    }
};
