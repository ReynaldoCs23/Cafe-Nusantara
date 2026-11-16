<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Pembaruan status untuk pelanggan (pengganti notifikasi WhatsApp).
 * Nama channel memakai token akses pesanan yang rahasia, dan isinya hanya status
 * tanpa data pribadi atau data internal staf.
 */
class OrderTracking implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(private Order $order)
    {
    }

    public function broadcastOn(): array
    {
        return [new Channel('order.' . $this->order->access_token)];
    }

    public function broadcastAs(): string
    {
        return 'status';
    }

    public function broadcastWith(): array
    {
        return [
            'order_number' => $this->order->order_number,
            'queue_number' => $this->order->queue_number,
            'status' => $this->order->status->value,
            'status_label' => $this->order->status->label(),
            'payment_status' => $this->order->payment_status->value,
            'fulfillment' => $this->order->fulfillment,
            'ready_at' => $this->order->ready_at?->toIso8601String(),
        ];
    }
}
