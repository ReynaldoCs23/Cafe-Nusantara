<?php

namespace Tests\Feature\Phase0;

use App\Models\Category;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

class AccessControlTest extends Phase0TestCase
{
    public function test_cashier_cannot_access_settings_users_or_catalog_management(): void
    {
        $this->actingAsRole('cashier');

        $this->getJson('/api/v1/admin/settings')->assertForbidden();
        $this->putJson('/api/v1/admin/settings', ['tax_rate' => 0])->assertForbidden();
        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->postJson('/api/v1/admin/products', [])->assertForbidden();
        $this->getJson('/api/v1/admin/reports?start_date=2026-01-01&end_date=2026-01-31')->assertForbidden();

        $this->getJson('/api/v1/admin/orders')->assertOk();
    }

    public function test_barista_and_customer_permissions(): void
    {
        $this->actingAsRole('barista');
        $this->getJson('/api/v1/admin/orders')->assertOk(); // boleh melihat antrean
        $this->postJson('/api/v1/admin/orders/x/payments', ['method' => 'cash'])->assertForbidden();
        $this->getJson('/api/v1/admin/products')->assertForbidden();

        Sanctum::actingAs(User::factory()->create(['role' => 'customer', 'username' => 'cust1']));
        $this->getJson('/api/v1/admin/orders')->assertForbidden();
        $this->getJson('/api/v1/admin/dashboard-metrics')->assertForbidden();
    }

    public function test_manager_cannot_manage_users_but_owner_can(): void
    {
        $this->actingAsRole('manager');
        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->getJson('/api/v1/admin/dashboard-metrics')->assertOk();

        $this->actingAsRole('owner');
        $this->getJson('/api/v1/admin/users')->assertOk();
        $this->putJson('/api/v1/admin/settings', ['tax_rate' => 11, 'service_charge_enabled' => true])
            ->assertOk()->assertJsonPath('data.tax_rate', 11);
    }

    public function test_inactive_staff_is_blocked(): void
    {
        $user = $this->staff('cashier', ['username' => 'nonaktif', 'is_active' => false]);

        $this->postJson('/api/v1/login', ['username' => 'nonaktif', 'password' => 'password'])->assertForbidden();

        Sanctum::actingAs($user);
        $this->getJson('/api/v1/admin/orders')->assertForbidden();
    }

    public function test_pin_login_works_for_staff_and_locks_after_failures(): void
    {
        $this->staff('cashier', ['username' => 'kasir1', 'pin' => '4321']);

        $this->postJson('/api/v1/staff/pin-login', ['username' => 'kasir1', 'pin' => '4321'])
            ->assertOk()->assertJsonPath('user.role', 'cashier');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/staff/pin-login', ['username' => 'kasir1', 'pin' => '0000'])->assertUnauthorized();
        }
        $this->postJson('/api/v1/staff/pin-login', ['username' => 'kasir1', 'pin' => '4321'])->assertStatus(429);
    }

    public function test_category_crud_works_for_manager(): void
    {
        $this->actingAsRole('manager');

        $id = $this->postJson('/api/v1/admin/categories', ['name' => 'Pastry'])
            ->assertCreated()->assertJsonPath('data.slug', 'pastry')->json('data.id');

        $this->putJson("/api/v1/admin/categories/{$id}", ['name' => 'Pastry & Kue'])
            ->assertOk()->assertJsonPath('data.slug', 'pastry-kue');

        $this->deleteJson("/api/v1/admin/categories/{$id}")->assertOk();
        $this->assertNull(Category::find($id));
    }

    public function test_last_owner_cannot_be_demoted(): void
    {
        $owner = $this->actingAsRole('owner');

        $this->putJson("/api/v1/admin/users/{$owner->id}", ['role' => 'manager'])->assertStatus(422);
    }
}
