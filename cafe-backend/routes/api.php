<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\Admin\AdminProductController;
use App\Http\Controllers\Api\Admin\AdminOrderController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminContentController;
use App\Http\Controllers\Api\Admin\AdminReviewController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\PaymentWebhookController;

use App\Http\Controllers\Api\AuthController;

/*
|--------------------------------------------------------------------------
| 1. PUBLIC API (CUSTOMER FACING)
|--------------------------------------------------------------------------
| Endpoint ini dipanggil oleh React untuk menampilkan Landing Page & Menu
*/
Route::prefix('v1')->group(function () {
    // Autentikasi
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    // Katalog & Menu
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{slug}', [ProductController::class, 'show']); // Detail produk
    
    // Konten Website
    Route::get('/content', [\App\Http\Controllers\Api\Admin\AdminContentController::class, 'index']);
    Route::get('/galleries', [\App\Http\Controllers\Api\GalleryController::class, 'index']);
    Route::get('/hero-slides', [\App\Http\Controllers\HeroSlideController::class, 'index']);

    // Ulasan (Public view)
    Route::get('/reviews', [ProductController::class, 'reviews']);
    Route::post('/reviews', [ProductController::class, 'storeReview']);

    // Proses Checkout (Asumsi Guest Checkout diizinkan)
    Route::post('/checkout', [OrderController::class, 'store']);
    Route::get('/orders/{order_number}', [OrderController::class, 'show']); // Halaman ringkasan sukses
});

/*
|--------------------------------------------------------------------------
| CUSTOMER PROTECTED API
|--------------------------------------------------------------------------
*/
Route::prefix('v1')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/my-orders', [OrderController::class, 'myOrders']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
});

/*
|--------------------------------------------------------------------------
| 2. PAYMENT GATEWAY WEBHOOK (SERVER-TO-SERVER)
|--------------------------------------------------------------------------
| Endpoint ini HANYA dipanggil oleh Midtrans/Xendit secara otomatis
*/
Route::post('/v1/payment/webhook', [PaymentWebhookController::class, 'handle']);


/*
|--------------------------------------------------------------------------
| 3. ADMIN BACK-OFFICE API (PROTECTED)
|--------------------------------------------------------------------------
| Menggunakan middleware 'auth:sanctum' & pengecekan role 'admin'
*/
Route::prefix('v1/admin')->middleware(['auth:sanctum', 'role:admin'])->group(function () {
    
    // Auth Logout
    Route::post('/logout', [AuthController::class, 'logout']);
    // Dashboard Analytics
    Route::get('/dashboard-metrics', [AdminDashboardController::class, 'metrics']);
    Route::get('/reports', [\App\Http\Controllers\Api\Admin\ReportController::class, 'index']);
    Route::get('/reports/export', [\App\Http\Controllers\Api\Admin\ReportController::class, 'exportExcel']);
    
    // Manajemen Inventaris & Menu (CRUD lengkap)
    Route::apiResource('products', AdminProductController::class);
    Route::apiResource('categories', \App\Http\Controllers\Api\CategoryController::class); // Fallback to public CategoryController for now
    Route::apiResource('users', AdminUserController::class);
    
    // Manajemen Pesanan
    Route::get('/orders', [AdminOrderController::class, 'index']); // List semua pesanan
    Route::get('/orders/{id}', [AdminOrderController::class, 'show']); // Detail pesanan
    Route::put('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']); // Ubah status pesanan
    
    Route::get('/content', [AdminContentController::class, 'index']);
    Route::post('/content', [AdminContentController::class, 'store']);
    Route::post('/content/{id}', [AdminContentController::class, 'update']);
    Route::put('/content/{id}', [AdminContentController::class, 'update']);
    Route::delete('/content/{id}', [AdminContentController::class, 'destroy']);
    
    // Manajemen Galeri
    Route::post('/galleries', [\App\Http\Controllers\Api\GalleryController::class, 'store']);
    Route::delete('/galleries/{id}', [\App\Http\Controllers\Api\GalleryController::class, 'destroy']);
    
    // Manajemen Hero Slides
    Route::post('/hero-slides', [\App\Http\Controllers\HeroSlideController::class, 'store']);
    Route::post('/hero-slides/{heroSlide}', [\App\Http\Controllers\HeroSlideController::class, 'update']);
    Route::delete('/hero-slides/{heroSlide}', [\App\Http\Controllers\HeroSlideController::class, 'destroy']);
    
    // Manajemen Ulasan
    Route::get('/reviews', [AdminReviewController::class, 'index']);
    Route::put('/reviews/{id}/visibility', [AdminReviewController::class, 'toggleVisibility']);

    // Integrasi Kasir Manual (Trigger tembak ke API Moka POS ulang jika gagal)
    Route::post('/orders/{id}/sync-moka', [AdminOrderController::class, 'syncToMoka']);
});