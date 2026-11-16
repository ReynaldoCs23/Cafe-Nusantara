<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\Http;

/**
 * Midtrans dipilih sebagai gateway (PRD Q3): QRIS dinamis, e-wallet, dan VA dalam satu Snap,
 * dokumentasi dan dukungan Indonesia yang luas. Fase 0 hanya verifikasi notifikasi;
 * pembuatan transaksi Snap ada di Fase 3.
 */
class MidtransGateway
{
    public function isConfigured(): bool
    {
        return filled($this->serverKey());
    }

    /**
     * signature_key = SHA512(order_id + status_code + gross_amount + server_key)
     */
    public function verifySignature(array $payload): bool
    {
        $signature = $payload['signature_key'] ?? null;
        if (! is_string($signature) || ! $this->isConfigured()) {
            return false;
        }

        $expected = hash('sha512',
            ($payload['order_id'] ?? '') .
            ($payload['status_code'] ?? '') .
            ($payload['gross_amount'] ?? '') .
            $this->serverKey()
        );

        return hash_equals($expected, $signature);
    }

    /**
     * Cek ulang status langsung ke API Midtrans agar tidak hanya mempercayai isi notifikasi.
     */
    public function fetchStatus(string $orderId): ?array
    {
        $response = Http::withBasicAuth($this->serverKey(), '')
            ->acceptJson()
            ->timeout(10)
            ->get($this->apiBaseUrl() . '/v2/' . rawurlencode($orderId) . '/status');

        return $response->successful() ? $response->json() : null;
    }

    public function shouldVerifyWithApi(): bool
    {
        return (bool) config('services.midtrans.verify_with_api', true);
    }

    private function serverKey(): ?string
    {
        return config('services.midtrans.server_key');
    }

    private function apiBaseUrl(): string
    {
        return config('services.midtrans.is_production')
            ? 'https://api.midtrans.com'
            : 'https://api.sandbox.midtrans.com';
    }
}
