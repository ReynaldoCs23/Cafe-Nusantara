import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { getImageUrl } from '../../utils/imageHelper';

const Profile = () => {
    const { user, token, login } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('data'); // 'data' | 'orders'
    
    // Edit Data State
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        password_confirmation: ''
    });
    const [updating, setUpdating] = useState(false);
    const [updateMsg, setUpdateMsg] = useState({ type: '', text: '' });

    // Orders State
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);

    useEffect(() => {
        if (!user || !token) {
            navigate('/login');
            return;
        }
        
        if (activeTab === 'orders') {
            fetchOrders();
        }
    }, [activeTab, user, token, navigate]);

    const fetchOrders = async () => {
        try {
            setLoadingOrders(true);
            const res = await api.get('/my-orders');
            setOrders(res.data.data);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setUpdating(true);
        setUpdateMsg({ type: '', text: '' });
        
        if (formData.password && formData.password !== formData.password_confirmation) {
            setUpdateMsg({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' });
            setUpdating(false);
            return;
        }

        try {
            const res = await api.put('/profile', formData);
            // Update context
            login(token, res.data.user);
            setUpdateMsg({ type: 'success', text: 'Profil berhasil diperbarui!' });
            setFormData({ ...formData, password: '', password_confirmation: '' });
        } catch (err) {
            setUpdateMsg({ type: 'error', text: err.response?.data?.message || 'Gagal memperbarui profil.' });
        } finally {
            setUpdating(false);
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
            case 'pending': return 'Menunggu Pembayaran';
            case 'paid': return 'Diproses';
            case 'completed': return 'Selesai';
            case 'failed': return 'Gagal / Dibatalkan';
            default: return status;
        }
    };

    return (
        <div className="animate-fade-in pb-20 bg-[#F9F8F6] min-h-screen">
            {/* Header */}
            <div className="w-full bg-surface-container-low/70 py-16 text-center border-b border-outline-variant/30 mb-12">
                <h1 className="font-display-lg text-4xl md:text-5xl text-on-surface font-bold tracking-tight">Akun Saya</h1>
                <p className="font-body-lg text-lg text-on-surface-variant mt-4 max-w-2xl mx-auto">Kelola data profil dan pantau riwayat pesanan Anda.</p>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Tabs */}
                <div className="flex space-x-4 border-b border-gray-200 mb-8">
                    <button 
                        onClick={() => setActiveTab('data')}
                        className={`pb-4 px-4 font-label-caps tracking-widest uppercase transition-colors relative ${activeTab === 'data' ? 'text-primary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Profil Saya
                        {activeTab === 'data' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('orders')}
                        className={`pb-4 px-4 font-label-caps tracking-widest uppercase transition-colors relative ${activeTab === 'orders' ? 'text-primary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Riwayat Pesanan
                        {activeTab === 'orders' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>}
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'data' && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl animate-fade-in">
                        <h2 className="font-headline-md text-2xl font-bold text-gray-900 mb-6">Informasi Pribadi</h2>
                        
                        {updateMsg.text && (
                            <div className={`mb-6 p-4 text-sm rounded-xl border ${updateMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {updateMsg.text}
                            </div>
                        )}

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                                <input 
                                    type="text" 
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleFormChange}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <input 
                                    type="email" 
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleFormChange}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            
                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-bold text-gray-900 mb-4">Ubah Kata Sandi <span className="font-normal text-gray-500">(Opsional)</span></h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Kata Sandi Baru</label>
                                        <input 
                                            type="password" 
                                            name="password"
                                            placeholder="Biarkan kosong jika tidak ingin diubah"
                                            value={formData.password}
                                            onChange={handleFormChange}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Konfirmasi Kata Sandi Baru</label>
                                        <input 
                                            type="password" 
                                            name="password_confirmation"
                                            placeholder="Ulangi kata sandi baru"
                                            value={formData.password_confirmation}
                                            onChange={handleFormChange}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={updating}
                                className="w-full md:w-auto px-8 bg-primary text-white font-bold tracking-widest uppercase py-4 rounded-xl hover:bg-[#7a3c28] transition-colors shadow-md disabled:opacity-50"
                            >
                                {updating ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="animate-fade-in">
                        {loadingOrders ? (
                            <div className="py-12 text-center text-gray-500">Memuat riwayat pesanan...</div>
                        ) : orders.length === 0 ? (
                            <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-gray-100">
                                <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">receipt_long</span>
                                <h3 className="font-headline-md text-xl font-bold text-gray-900 mb-2">Belum Ada Pesanan</h3>
                                <p className="text-gray-500 mb-6">Anda belum pernah melakukan pemesanan sebelumnya.</p>
                                <button onClick={() => navigate('/menu')} className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-[#7a3c28] transition-colors">
                                    Lihat Menu Kami
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {orders.map(order => (
                                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="font-bold text-gray-900">{order.order_number}</span>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                                        {getStatusText(order.status)}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-500 mb-1">Total Pembayaran</div>
                                                <div className="font-bold text-primary text-lg">{formatPrice(order.grand_total)}</div>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <div className="space-y-4">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded overflow-hidden shrink-0 border border-gray-100 shadow-sm bg-gray-50">
                                                                <img 
                                                                    className="w-full h-full object-cover" 
                                                                    src={getImageUrl(item.product?.image_url)} 
                                                                    alt={item.product_name} 
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-900 text-base">{item.product_name}</span>
                                                                <span className="text-gray-500 text-xs font-bold">{item.quantity}x</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-gray-800 font-bold">{formatPrice(item.price_at_transaction * item.quantity)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
