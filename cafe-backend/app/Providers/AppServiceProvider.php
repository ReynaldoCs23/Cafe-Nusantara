<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // PRD bagian 10: login 5x/menit, tulis publik 10x/menit per IP
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)->by(strtolower((string) $request->input('username')) . '|' . $request->ip()));
        RateLimiter::for('pin-login', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));
        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));
        RateLimiter::for('public-write', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('public-lookup', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));
    }
}
