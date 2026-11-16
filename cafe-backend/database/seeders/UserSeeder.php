<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $staff = [
            ['Owner Cafe', 'owner', 'owner@cafenusantara.com', 'owner', '111111'],
            ['Manager Shift', 'manager', 'manager@cafenusantara.com', 'manager', '222222'],
            ['Kasir 1', 'kasir', 'kasir@cafenusantara.com', 'cashier', '333333'],
            ['Barista 1', 'barista', 'barista@cafenusantara.com', 'barista', '444444'],
            ['Pelayan 1', 'pelayan', 'pelayan@cafenusantara.com', 'waiter', '555555'],
        ];

        foreach ($staff as [$name, $username, $email, $role, $pin]) {
            $user = User::firstOrNew(['email' => $email]);
            $user->fill([
                'name' => $name,
                'username' => $username,
                'role' => $role,
                'password' => Hash::make('password'),
                'is_active' => true,
            ]);
            $user->setPin($pin);
            $user->save();
        }

        User::firstOrCreate(['email' => 'customer@cafenusantara.com'], [
            'name' => 'Pelanggan Setia',
            'username' => 'pelanggan',
            'role' => 'customer',
            'password' => Hash::make('password'),
        ]);
    }
}
