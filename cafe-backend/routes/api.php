<?php

use App\Http\Controllers\Api\Admin\AdminCategoryController;
use App\Http\Controllers\Api\Admin\AdminContentController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminModifierGroupController;
use App\Http\Controllers\Api\Admin\AdminOrderController;
use App\Http\Controllers\Api\Admin\AdminProductController;
use App\Http\Controllers\Api\Admin\AdminReviewController;
use App\Http\Controllers\Api\Admin\AdminSettingsController;
use App\Http\Controllers\Api\Admin\AdminTableController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\GalleryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\Pos\KitchenController;
use App\Http\Controllers\Api\Pos\PosController;
use App\Http\Controllers\Api\Pos\ShiftController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Controllers\HeroSlideController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| 1. PUBLIK & PELANGGAN
|--------------------------------------------------------------------------
*/
Route::prefix('v1')->group(function () {
    // Autentikasi
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('/staff/pin-login', [AuthController::class, 'pinLogin'])->middleware('throttle:pin-login'); // + kunci 5x gagal di controller

    // Toko, katalog & menu
    Route::get('/store/status', [StoreController::class, 'status']);
    Route::get('/tables/{token}', [StoreController::class, 'table'])->middleware('throttle:public-lookup');
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}', [ProductController::class, 'show']);

    // Konten website
    Route::get('/content', [AdminContentController::class, 'index']);
    Route::get('/galleries', [GalleryController::class, 'index']);
    Route::get('/hero-slides', [HeroSlideController::class, 'index']);

    // Ulasan
    Route::get('/reviews', [ProductController::class, 'reviews']);
    Route::post('/reviews', [ProductController::class, 'storeReview'])->middleware('throttle:public-write');

    // Pemesanan mandiri (QR meja & online)
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:public-write');
    Route::post('/checkout', [OrderController::class, 'store'])->middleware('throttle:public-write'); // alias lama
    Route::get('/orders/{order_number}', [OrderController::class, 'show'])->middleware('throttle:public-lookup');

    // Papan antrean di TV (hanya nomor antrean)
    Route::get('/ready-board', [KitchenController::class, 'readyBoard'])->middleware('throttle:public-lookup');

    // Webhook payment gateway (server-to-server)
    Route::post('/payment/webhook/midtrans', [PaymentWebhookController::class, 'midtrans']);
    Route::post('/payment/webhook', [PaymentWebhookController::class, 'midtrans']); // alias lama
});

/*
|--------------------------------------------------------------------------
| 2. SEMUA PENGGUNA LOGIN
|--------------------------------------------------------------------------
*/
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/my-orders', [OrderController::class, 'myOrders']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
});

/*
|--------------------------------------------------------------------------
| 3. BACK-OFFICE STAF (hak akses sesuai PRD bagian 4)
|--------------------------------------------------------------------------
*/
Route::prefix('v1/admin')->middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']); // alias lama

    // Kasir, manager, owner: POS, pembayaran, pembatalan, shift
    Route::middleware('role:owner,manager,cashier')->group(function () {
        Route::post('/orders/{id}/payments', [AdminOrderController::class, 'recordPayment']);
        Route::post('/orders/{id}/cancel', [AdminOrderController::class, 'cancel']);

        Route::get('/pos/menu', [PosController::class, 'menu']);
        Route::post('/pos/orders', [PosController::class, 'store']);
        Route::post('/pos/order-items/{id}/void', [PosController::class, 'voidItem']);
        Route::get('/pos/orders/{id}/receipt', [PosController::class, 'receipt']);

        Route::get('/pos/shift', [ShiftController::class, 'current']);
        Route::post('/pos/shift/open', [ShiftController::class, 'open']);
        Route::post('/pos/shift/movements', [ShiftController::class, 'movement']);
        Route::post('/pos/shift/close', [ShiftController::class, 'close']);
    });

    // Layar bar/dapur
    Route::middleware('role:owner,manager,cashier,barista')->group(function () {
        Route::get('/kds/queue', [KitchenController::class, 'queue']);
        Route::post('/kds/orders/{id}/items', [KitchenController::class, 'updateItems']);
    });

    // Penyerahan pesanan siap (kasir & pelayan)
    Route::middleware('role:owner,manager,cashier,barista,waiter')->group(function () {
        Route::get('/handoff', [KitchenController::class, 'handoff']);
    });

    // Semua staf: lihat pesanan & ubah status (dibuat, siap, diserahkan)
    Route::middleware('role:owner,manager,cashier,barista,waiter')->group(function () {
        Route::get('/orders', [AdminOrderController::class, 'index']);
        Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
        Route::put('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
    });

    // Tombol tersedia/habis dari POS dan KDS
    Route::middleware('role:owner,manager,cashier,barista')->group(function () {
        Route::patch('/products/{id}/availability', [AdminProductController::class, 'availability']);
    });

    // Manager & owner: menu, konten, laporan
    Route::middleware('role:owner,manager')->group(function () {
        Route::get('/dashboard-metrics', [AdminDashboardController::class, 'metrics']);
        Route::get('/reports', [ReportController::class, 'index']);
        Route::get('/reports/export', [ReportController::class, 'exportExcel']);

        Route::apiResource('products', AdminProductController::class);
        Route::apiResource('categories', AdminCategoryController::class);
        Route::apiResource('modifier-groups', AdminModifierGroupController::class);
        Route::apiResource('tables', AdminTableController::class);
        Route::post('/tables/{id}/rotate-qr', [AdminTableController::class, 'rotateQr']);
        Route::get('/shifts', [ShiftController::class, 'index']);
        Route::get('/shifts/{id}', [ShiftController::class, 'show']);

        Route::get('/content', [AdminContentController::class, 'index']);
        Route::post('/content', [AdminContentController::class, 'store']);
        Route::post('/content/{id}', [AdminContentController::class, 'update']);
        Route::put('/content/{id}', [AdminContentController::class, 'update']);
        Route::delete('/content/{id}', [AdminContentController::class, 'destroy']);

        Route::post('/galleries', [GalleryController::class, 'store']);
        Route::delete('/galleries/{id}', [GalleryController::class, 'destroy']);

        Route::post('/hero-slides', [HeroSlideController::class, 'store']);
        Route::post('/hero-slides/{heroSlide}', [HeroSlideController::class, 'update']);
        Route::delete('/hero-slides/{heroSlide}', [HeroSlideController::class, 'destroy']);

        Route::get('/reviews', [AdminReviewController::class, 'index']);
        Route::put('/reviews/{id}/visibility', [AdminReviewController::class, 'toggleVisibility']);
    });

    // Khusus owner: pengguna & pengaturan toko
    Route::middleware('role:owner')->group(function () {
        Route::apiResource('users', AdminUserController::class);
        Route::get('/settings', [AdminSettingsController::class, 'show']);
        Route::put('/settings', [AdminSettingsController::class, 'update']);
    });
});
