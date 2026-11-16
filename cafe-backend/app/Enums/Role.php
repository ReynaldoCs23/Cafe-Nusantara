<?php

namespace App\Enums;

enum Role: string
{
    case Owner = 'owner';
    case Manager = 'manager';
    case Cashier = 'cashier';
    case Barista = 'barista';
    case Waiter = 'waiter';
    case Customer = 'customer';

    public static function staffValues(): array
    {
        return [self::Owner->value, self::Manager->value, self::Cashier->value, self::Barista->value, self::Waiter->value];
    }

    public static function values(): array
    {
        return array_map(fn (self $role) => $role->value, self::cases());
    }

    public function label(): string
    {
        return match ($this) {
            self::Owner => 'Owner',
            self::Manager => 'Manager',
            self::Cashier => 'Kasir',
            self::Barista => 'Barista/Dapur',
            self::Waiter => 'Pelayan',
            self::Customer => 'Pelanggan',
        };
    }
}
