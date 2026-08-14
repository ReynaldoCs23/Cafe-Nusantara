<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Events\OrderCreated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($request) {
            $subtotal = 0;
            $orderItemsData = [];

            foreach ($request->items as $item) {
                // Fetch the real product to get the actual price (prevent frontend tampering)
                $product = Product::findOrFail($item['product_id']);
                $quantity = $item['quantity'];
                
                if ($product->stock_quantity < $quantity) {
                    abort(400, "Stok produk {$product->name} tidak mencukupi.");
                }

                $product->stock_quantity -= $quantity;
                if ($product->stock_quantity <= 0) {
                    $product->stock_quantity = 0;
                    $product->is_active = false;
                }
                $product->save();

                $itemPrice = $product->price;
                // Add extra cost if size is Large
                if (isset($item['customizations']['size']) && $item['customizations']['size'] === 'Large') {
                    $itemPrice += 5000;
                }
                
                $itemTotal = $itemPrice * $quantity;
                $subtotal += $itemTotal;

                $orderItemsData[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $quantity,
                    'price_at_transaction' => $itemPrice,
                    'customizations' => isset($item['customizations']) ? json_encode($item['customizations']) : null,
                ];
            }

            // Calculate totals (11% tax)
            $tax_amount = intval($subtotal * 0.11);
            $grand_total = $subtotal + $tax_amount;

            // Create Order
            $order = new Order();
            $order->id = (string) Str::uuid();
            
            // Check if user is authenticated via Sanctum (optional for guest checkout)
            $order->user_id = $request->user('sanctum') ? $request->user('sanctum')->id : null;
            
            $order->order_number = 'ORD-' . time() . '-' . strtoupper(Str::random(4));
            $order->subtotal = $subtotal;
            $order->tax_amount = $tax_amount;
            $order->grand_total = $grand_total;
            $order->status = 'pending';
            $order->save();

            // Attach Order Items
            $itemsToInsert = array_map(function ($data) use ($order) {
                $data['order_id'] = $order->id;
                $data['created_at'] = now();
                $data['updated_at'] = now();
                return $data;
            }, $orderItemsData);

            OrderItem::insert($itemsToInsert);

            // Dispatch real-time event for dashboard & order management
            event(new OrderCreated($order));

            return response()->json([
                'message' => 'Pesanan berhasil dibuat',
                'data' => $order
            ], 201);
        });
    }

    public function show($order_number)
    {
        $order = Order::with('items')->where('order_number', $order_number)->firstOrFail();
        
        return response()->json([
            'data' => $order
        ], 200);
    }

    public function myOrders(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $orders = Order::with('items.product')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json([
            'data' => $orders
        ], 200);
    }
}
