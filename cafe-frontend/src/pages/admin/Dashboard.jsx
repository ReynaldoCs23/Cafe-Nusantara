import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { echo } from '../../utils/echo';

const Dashboard = () => {
    const [metrics, setMetrics] = useState({
        totalRevenue: 0,
        activeOrders: 0,
        totalOrdersToday: 0,
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchDashboard = async (isBackground = false) => {
        if (!isBackground) setIsRefreshing(true);
        try {
            const response = await api.get('/admin/dashboard-metrics');
            const metricData = response.data.data || response.data; // Handle wrapped or unwrapped data
            setMetrics({
                totalRevenue: metricData.total_revenue || 0,
                activeOrders: metricData.active_orders || 0,
                totalOrdersToday: metricData.total_orders_today || 0,
            });
            setRecentOrders(metricData.recent_orders || []);
            setError(null);
        } catch (err) {
            setError('Failed to fetch dashboard metrics. Is the backend running?');
            console.error("Fetch Error Dashboard:", err.response || err);
        } finally {
            if (!isBackground) setIsRefreshing(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
        
        // Polling every 30 seconds as fallback
        const intervalId = setInterval(() => {
            fetchDashboard(true);
        }, 30000);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const channel = echo.channel('admin.orders');

        channel.listen('OrderCreated', (e) => {
            // Optimistically add the new order to the top of the recent list
            setRecentOrders(prev => [e.order, ...prev].slice(0, 5));
            
            // Update metrics dynamically
            setMetrics(prev => ({
                ...prev,
                activeOrders: prev.activeOrders + 1,
                totalOrdersToday: prev.totalOrdersToday + 1
            }));
        });

        channel.listen('OrderStatusUpdated', (e) => {
            setRecentOrders(prev => prev.map(order => order.id === e.order.id ? e.order : order));
            
            // If an order was completed/cancelled, decrement active orders
            if (e.order.status === 'completed' || e.order.status === 'cancelled') {
                setMetrics(prev => ({
                    ...prev,
                    activeOrders: Math.max(0, prev.activeOrders - 1)
                }));
            }
        });

        return () => {
            echo.leaveChannel('admin.orders');
        };
    }, []);

    if (loading) return <div className="p-6 text-on-surface-variant animate-pulse font-label-caps">Loading dashboard...</div>;
    if (error) return <div className="p-6 text-error">{error}</div>;

    return (
        <div className="animate-fade-in font-body-md text-on-surface relative">
            <div className="flex justify-between items-center mb-6">
                <h1 className="font-headline-lg text-[32px] text-on-background">Dashboard</h1>
                <button 
                    onClick={() => fetchDashboard()} 
                    disabled={isRefreshing}
                    className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded shadow-sm hover:bg-primary-container transition-colors disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
                    {isRefreshing ? 'Menyegarkan...' : 'Segarkan'}
                </button>
            </div>

            {/* Metrics Row */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {/* Card 1 */}
                <div className="bg-surface border border-outline-variant p-6 rounded flex flex-col gap-4 hover:border-primary transition-colors">
                    <p className="font-label-caps text-label-caps text-on-surface-variant">Pendapatan Hari Ini</p>
                    <h3 className="font-headline-lg text-[32px] text-primary leading-none">Rp {metrics.totalRevenue.toLocaleString('id-ID')}</h3>
                    <p className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">trending_up</span>
                        Active tracking
                    </p>
                </div>
                
                {/* Card 2 */}
                <div className="bg-surface border border-outline-variant p-6 rounded flex flex-col gap-4 hover:border-primary transition-colors">
                    <p className="font-label-caps text-label-caps text-on-surface-variant">Pesanan Aktif</p>
                    <h3 className="font-headline-lg text-[32px] text-on-surface leading-none">{metrics.activeOrders}</h3>
                    <p className="font-label-sm text-label-sm text-error flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                        Menunggu diproses
                    </p>
                </div>
                
                {/* Card 3 */}
                <div className="bg-surface border border-outline-variant p-6 rounded flex flex-col gap-4 hover:border-primary transition-colors">
                    <p className="font-label-caps text-label-caps text-on-surface-variant">Total Pesanan</p>
                    <h3 className="font-headline-lg text-[32px] text-on-surface leading-none">{metrics.totalOrdersToday}</h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                        Hari ini
                    </p>
                </div>
                
                {/* Card 4 */}
                <div className="bg-surface border border-outline-variant p-6 rounded flex flex-col gap-4 hover:border-primary transition-colors">
                    <p className="font-label-caps text-label-caps text-on-surface-variant">Status Sistem</p>
                    <h3 className="font-headline-md text-[24px] text-secondary leading-none mt-2">Optimal</h3>
                    <p className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Semua layanan online
                    </p>
                </div>
            </section>

            {/* Recent Orders Section */}
            <section className="bg-surface border border-outline-variant rounded overflow-hidden mb-12 shadow-sm">
                <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
                    <h2 className="font-headline-md text-[24px] text-on-surface">Pesanan Terbaru</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-outline-variant bg-surface-container-low">
                                <th className="py-4 px-6 font-label-caps text-label-caps text-on-surface-variant">Order ID</th>
                                <th className="py-4 px-6 font-label-caps text-label-caps text-on-surface-variant">Waktu</th>
                                <th className="py-4 px-6 font-label-caps text-label-caps text-on-surface-variant">Total</th>
                                <th className="py-4 px-6 font-label-caps text-label-caps text-on-surface-variant">Status</th>
                            </tr>
                        </thead>
                        <tbody className="font-body-md text-body-md">
                            {recentOrders.map(order => (
                                <tr key={order.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                                    <td className="py-4 px-6 font-medium text-primary">{order.order_number}</td>
                                    <td className="py-4 px-6 text-on-surface-variant">
                                        {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </td>
                                    <td className="py-4 px-6">Rp {order.grand_total?.toLocaleString('id-ID')}</td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full font-label-caps text-[10px] uppercase ${
                                            order.status === 'pending' ? 'bg-error-container text-on-error-container' :
                                            (order.status === 'paid' || order.status === 'completed') ? 'bg-secondary-container text-on-secondary-container' :
                                            order.status === 'processing' ? 'bg-primary-container text-on-primary-container' :
                                            'bg-surface-container-high text-on-surface-variant border border-outline'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {recentOrders.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="py-4 px-6 text-center text-on-surface-variant">Belum ada pesanan terbaru.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
