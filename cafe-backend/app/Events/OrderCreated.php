<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Order $order)
    {
    }

    /** Hanya staf yang boleh mendengar (lihat routes/channels.php). */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('staff.orders')];
    }

    public function broadcastWith(): array
    {
        $this->order->loadMissing('items', 'diningTable:id,name');

        return ['order' => $this->order->toArray()];
    }
}
