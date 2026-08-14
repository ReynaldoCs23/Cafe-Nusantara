<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Super Admin',
            'email' => 'admin@cafenusantara.com',
            'role' => 'admin',
            'password' => Hash::make('password'),
        ]);

        User::create([
            'name' => 'Pelanggan Setia',
            'email' => 'customer@cafenusantara.com',
            'role' => 'customer',
            'password' => Hash::make('password'),
        ]);
    }
}
