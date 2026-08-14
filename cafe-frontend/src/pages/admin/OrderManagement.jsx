import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { echo } from '../../utils/echo';

const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        const channel = echo.channel('admin.orders');

        channel.listen('OrderCreated', (e) => {
            // Prepend new order to the list
            setOrders(prev => [e.order, ...prev]);
        });

        channel.listen('OrderStatusUpdated', (e) => {
            // Update the status of the specific order
            setOrders(prev => prev.map(order => order.id === e.order.id ? e.order : order));
            
            // Update selectedOrder if it's currently being viewed
            setSelectedOrder(current => current?.id === e.order.id ? e.order : current);
        });

        return () => {
            echo.leaveChannel('admin.orders');
        };
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/admin/orders');
            const data = response.data.data || response.data;
            setOrders(data);
            if (data.length > 0) {
                setSelectedOrder(data[0]);
            }
        } catch (err) {
            setError('Failed to fetch orders');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
            
            // Update local lists
            const updatedOrders = orders.map(order => 
                order.id === orderId ? { ...order, status: newStatus } : order
            );
            setOrders(updatedOrders);
            
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus });
            }
            
            setToast(`Order status updated to ${newStatus}`);
            setTimeout(() => setToast(''), 3000);
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    };

    if (loading) return <div className="p-6 text-on-surface-variant animate-pulse font-label-caps">Loading orders...</div>;
    if (error) return <div className="p-6 text-error">{error}</div>;

    return (
        <div className="flex h-[calc(100vh-6rem)] -m-gutter font-body-md text-on-surface bg-background">
            {toast && (
                <div className="fixed top-20 right-8 bg-secondary text-on-secondary px-6 py-3 rounded shadow-md z-50 animate-fade-in font-label-caps text-label-caps flex items-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    {toast}
                </div>
            )}
            
            {/* Left: Order List Panel */}
            <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-outline-variant bg-surface flex flex-col">
                <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center sticky top-0 z-10">
                    <h3 className="font-label-caps text-label-caps text-primary tracking-widest">Active Orders</h3>
                    <div className="flex gap-2 items-center">
                        <button 
                            onClick={fetchOrders}
                            className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 rounded flex items-center gap-1 transition-colors"
                            title="Segarkan"
                        >
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                            <span className="font-label-sm font-bold uppercase tracking-wider text-xs">Segarkan</span>
                        </button>
                        <span className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2 py-1 rounded">
                            {orders.length} Total
                        </span>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                    {orders.map(order => (
                        <div 
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`p-4 border bg-surface cursor-pointer transition-colors relative rounded ${
                                selectedOrder?.id === order.id 
                                    ? 'border-primary bg-surface-container-lowest shadow-sm' 
                                    : 'border-outline-variant hover:border-outline'
                            }`}
                        >
                            {selectedOrder?.id === order.id && (
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l"></div>
                            )}
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-label-caps text-label-caps text-primary font-bold">{order.order_number}</span>
                                <span className="font-label-sm text-label-sm text-on-surface-variant">
                                    {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            <div className="font-body-md text-body-md text-on-surface mb-1 flex items-center gap-2">
                                <span className="uppercase text-xs font-bold px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant">
                                    {order.status}
                                </span>
                            </div>
                            <div className="flex justify-between items-end mt-4">
                                <span className="font-label-sm text-label-sm text-tertiary">{order.items?.length || 0} Items</span>
                                <span className="font-body-md text-body-md font-medium text-primary">
                                    Rp {order.grand_total?.toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>
                    ))}
                    {orders.length === 0 && (
                        <div className="text-center text-on-surface-variant p-4">No orders found.</div>
                    )}
                </div>
            </div>

            {/* Right: Order Detail Panel */}
            <div className="flex-1 flex flex-col bg-surface-bright relative">
                {selectedOrder ? (
                    <>
                        {/* Detail Header */}
                        <div className="px-10 py-6 border-b border-outline-variant flex justify-between items-center bg-surface sticky top-0 z-10 shadow-sm">
                            <div>
                                <h2 className="font-headline-lg text-[32px] text-on-surface mb-1">{selectedOrder.order_number}</h2>
                                <p className="font-body-md text-body-md text-tertiary">
                                    Placed on {new Date(selectedOrder.created_at).toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'})}
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <select 
                                    value={selectedOrder.status}
                                    onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                                    className="px-4 py-2 border border-outline-variant bg-surface rounded font-label-caps text-label-caps text-on-surface focus:border-primary focus:ring-0 uppercase cursor-pointer"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="processing">Processing</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>

                        {/* Detail Content */}
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                            
                            {/* Itemized List */}
                            <section>
                                <h4 className="font-label-caps text-label-caps text-tertiary mb-4 tracking-widest border-b border-outline-variant pb-2">Order Items</h4>
                                <div className="space-y-4">
                                    {selectedOrder.items?.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center py-2 border-b border-outline-variant border-opacity-50 last:border-0">
                                            <div className="flex gap-4 items-center">
                                                <div className="font-body-md text-body-md text-tertiary w-8 font-bold">{item.quantity}x</div>
                                                
                                                {item.product?.image_url ? (
                                                    <img src={item.product.image_url} alt={item.product.name} className="w-10 h-10 object-cover rounded shadow-sm border border-outline-variant" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-surface-container-high rounded flex items-center justify-center border border-outline-variant opacity-70">
                                                        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">image</span>
                                                    </div>
                                                )}

                                                <div>
                                                    <p className="font-body-md text-body-md text-on-surface font-medium">
                                                        {item.product?.name || item.product_name || `Product #${item.product_id}`}
                                                    </p>
                                                    {item.customizations && (
                                                        <div className="text-xs text-gray-500 mt-1 mb-1">
                                                            {item.customizations?.size && <span>Ukuran: {item.customizations.size} </span>}
                                                            {item.customizations?.ice && <span>| Es: {item.customizations.ice} </span>}
                                                            {item.customizations?.sugar && <span>| Gula: {item.customizations.sugar}</span>}
                                                        </div>
                                                    )}
                                                    <p className="font-label-sm text-label-sm text-tertiary">@ Rp {Number(item.price_at_transaction || item.product?.price || 0).toLocaleString('id-ID')}</p>
                                                </div>
                                            </div>
                                            <span className="font-body-md text-body-md text-on-surface font-bold">
                                                Rp {(item.quantity * Number(item.price_at_transaction || item.product?.price || 0)).toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    ))}
                                    {!selectedOrder.items?.length && (
                                        <p className="text-on-surface-variant">No items found for this order.</p>
                                    )}
                                </div>
                            </section>

                            {/* Financials & Payment */}
                            <div className="flex gap-10">
                                <section className="flex-1">
                                    <h4 className="font-label-caps text-label-caps text-tertiary mb-4 tracking-widest border-b border-outline-variant pb-2">Payment Info</h4>
                                    <div>
                                        <p className="font-label-sm text-label-sm text-tertiary mb-1">Status</p>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="material-symbols-outlined text-primary">payments</span>
                                            <p className="font-body-md text-body-md text-on-surface uppercase font-bold">{selectedOrder.status}</p>
                                        </div>
                                    </div>
                                </section>

                                {/* Financial Breakdown */}
                                <section className="flex-1 bg-surface-container-low p-6 border border-outline-variant rounded shadow-sm">
                                    <div className="space-y-3 mb-4">
                                        <div className="flex justify-between font-body-md text-body-md text-tertiary">
                                            <span>Subtotal</span>
                                            <span>Rp {selectedOrder.subtotal?.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between font-body-md text-body-md text-tertiary">
                                            <span>Tax</span>
                                            <span>Rp {selectedOrder.tax?.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                    <div className="border-t border-outline-variant pt-4 flex justify-between items-end">
                                        <span className="font-label-caps text-label-caps text-on-surface tracking-widest">Total</span>
                                        <span className="font-headline-md text-[24px] text-primary font-bold">
                                            Rp {selectedOrder.grand_total?.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-on-surface-variant flex-col gap-4">
                        <span className="material-symbols-outlined text-[64px] opacity-20">receipt_long</span>
                        <p className="font-label-caps text-label-caps tracking-widest opacity-50">Select an order to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderManagement;
