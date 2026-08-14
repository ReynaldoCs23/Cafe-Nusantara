import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const Reports = () => {
    // Set default dates to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);
    const [reportData, setReportData] = useState({ total_revenue: 0, total_orders: 0, orders: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchReports = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/admin/reports?start_date=${startDate}&end_date=${endDate}`);
            setReportData(res.data);
        } catch (err) {
            console.error('Failed to fetch reports:', err);
            setError(err.response?.data?.message || 'Gagal mengambil data laporan.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDownloadExcel = async () => {
        try {
            const res = await api.get(`/admin/reports/export?start_date=${startDate}&end_date=${endDate}`, {
                responseType: 'blob' // CRITICAL: This tells axios to handle binary data
            });

            // Create a blob from the response
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            
            // Create a hidden anchor element to trigger download
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Laporan_Penjualan_${startDate}_to_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
            alert('Gagal mengunduh Excel. Pastikan server merespons dengan benar.');
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'paid': return 'bg-blue-100 text-blue-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'failed': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return 'Menunggu';
            case 'paid': return 'Diproses';
            case 'completed': return 'Selesai';
            case 'failed': return 'Gagal / Batal';
            default: return status;
        }
    };

    return (
        <div className="animate-fade-in font-body-md text-on-surface">
            <h2 className="font-headline-lg text-[32px] text-on-surface mb-8">Laporan Penjualan</h2>

            {/* Filter Section */}
            <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm mb-8">
                <h3 className="font-headline-md text-lg font-bold mb-4">Filter Periode</h3>
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="w-full md:w-auto flex-grow max-w-[250px]">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal Mulai</label>
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-primary"
                        />
                    </div>
                    <div className="w-full md:w-auto flex-grow max-w-[250px]">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal Akhir</label>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-primary"
                        />
                    </div>
                    <button 
                        onClick={fetchReports}
                        disabled={loading}
                        className="bg-primary text-white px-6 py-2.5 rounded font-bold uppercase tracking-wider text-sm hover:bg-amber-800 transition-colors shadow-sm disabled:opacity-50 h-[42px] flex items-center justify-center min-w-[160px]"
                    >
                        {loading ? 'MEMUAT...' : 'TERAPKAN FILTER'}
                    </button>
                    <button 
                        onClick={handleDownloadExcel}
                        className="bg-[#217346] text-white px-6 py-2.5 rounded font-bold uppercase tracking-wider text-sm hover:bg-[#1e6b41] transition-colors shadow-sm h-[42px] flex items-center justify-center min-w-[160px] gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                        UNDUH EXCEL
                    </button>
                </div>
                {error && <div className="text-red-600 mt-4 text-sm">{error}</div>}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-surface border border-outline-variant rounded-xl p-8 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-green-600 text-3xl">payments</span>
                    </div>
                    <div>
                        <p className="text-gray-500 font-label-caps uppercase tracking-wider text-sm mb-1">Total Pendapatan (Selesai)</p>
                        <h4 className="font-headline-lg text-3xl font-bold text-gray-900">
                            {formatPrice(reportData.total_revenue)}
                        </h4>
                    </div>
                </div>
                <div className="bg-surface border border-outline-variant rounded-xl p-8 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-blue-600 text-3xl">shopping_cart</span>
                    </div>
                    <div>
                        <p className="text-gray-500 font-label-caps uppercase tracking-wider text-sm mb-1">Total Pesanan</p>
                        <h4 className="font-headline-lg text-3xl font-bold text-gray-900">
                            {reportData.total_orders}
                        </h4>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-outline-variant bg-gray-50">
                    <h3 className="font-headline-md text-lg font-bold">Rincian Pesanan</h3>
                </div>
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Memuat data...</div>
                ) : reportData.orders.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">Tidak ada pesanan pada periode ini.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-outline-variant bg-surface-container-lowest">
                                    <th className="px-6 py-4 font-bold text-sm text-gray-700">Order ID</th>
                                    <th className="px-6 py-4 font-bold text-sm text-gray-700">Tanggal</th>
                                    <th className="px-6 py-4 font-bold text-sm text-gray-700">Pelanggan</th>
                                    <th className="px-6 py-4 font-bold text-sm text-gray-700 text-right">Total (Rp)</th>
                                    <th className="px-6 py-4 font-bold text-sm text-gray-700 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.orders.map((order) => (
                                    <tr key={order.id} className="border-b border-outline-variant hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {order.order_number}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {order.user ? order.user.name : 'Guest'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-primary text-right">
                                            {formatPrice(order.grand_total)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                                {getStatusText(order.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
