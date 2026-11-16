<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Channel pesanan hanya untuk staf aktif
Broadcast::channel('staff.orders', function (User $user) {
    return $user->is_active && $user->isStaff();
});
