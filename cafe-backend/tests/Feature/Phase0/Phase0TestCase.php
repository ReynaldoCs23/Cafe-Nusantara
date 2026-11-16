<?php

namespace Tests\Feature\Phase0;

use App\Models\Category;
use App\Models\Modifier;
use App\Models\ModifierGroup;
use App\Models\Product;
use App\Models\User;
use App\Support\StoreSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

abstract class Phase0TestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $alwaysOpen = collect(StoreSettings::DAYS)
            ->mapWithKeys(fn ($day) => [$day => ['open' => '00:00', 'close' => '00:00', 'closed' => false]])
            ->all();

        StoreSettings::set([
            'opening_hours' => $alwaysOpen,
            'temporarily_closed' => false,
            'tax_rate' => 10,
            'tax_inclusive' => false,
            'service_charge_enabled' => false,
            'rounding' => 0,
        ]);
    }

    protected function staff(string $role, array $attributes = []): User
    {
        $user = new User(array_merge([
            'name' => ucfirst($role) . ' Test',
            'username' => $role . uniqid(),
            'email' => $role . uniqid() . '@test.local',
            'password' => 'password',
            'role' => $role,
            'is_active' => true,
        ], $attributes));
        $user->setPin($attributes['pin'] ?? '123456');
        unset($user->pin);
        $user->save();

        return $user;
    }

    /**
     * Login sebagai peran tertentu. Peran yang menerima pembayaran otomatis dibukakan shift
     * (sejak Fase 1, pembayaran wajib tercatat di shift kasir).
     */
    protected function actingAsRole(string $role, bool $openShift = true): User
    {
        $user = $this->staff($role);
        Sanctum::actingAs($user);

        if ($openShift && in_array($role, ['owner', 'manager', 'cashier'], true)) {
            app(\App\Services\ShiftService::class)->open($user, 100000);
        }

        return $user;
    }

    protected function product(array $attributes = []): Product
    {
        $category = Category::firstOrCreate(['slug' => 'kopi'], ['name' => 'Kopi']);

        return Product::create(array_merge([
            'category_id' => $category->id,
            'name' => 'Kopi Susu',
            'price' => 20000,
            'station' => 'bar',
            'stock_quantity' => 10,
            'track_stock' => true,
            'is_active' => true,
            'is_available' => true,
        ], $attributes));
    }

    /** @return array{0: ModifierGroup, 1: Modifier, 2: Modifier} */
    protected function sizeGroup(Product $product): array
    {
        $group = ModifierGroup::create(['name' => 'Ukuran', 'min_select' => 1, 'max_select' => 1]);
        $regular = $group->modifiers()->create(['name' => 'Regular', 'price_delta' => 0]);
        $large = $group->modifiers()->create(['name' => 'Large', 'price_delta' => 5000]);
        $product->modifierGroups()->attach($group->id);

        return [$group, $regular, $large];
    }

    protected function placeOrder(array $items, array $extra = [], array $headers = [])
    {
        return $this->postJson('/api/v1/orders', array_merge([
            'items' => $items,
            'customer_name' => 'Budi',
            'customer_phone' => '081234567890',
        ], $extra), $headers);
    }
}
