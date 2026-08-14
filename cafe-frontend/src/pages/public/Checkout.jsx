import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { getImageUrl } from '../../utils/imageHelper';

const Checkout = () => {
    const { cartItems, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        address: ''
    });
    
    const [paymentMethod, setPaymentMethod] = useState('QRIS');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            const nameParts = user.name ? user.name.split(' ') : [];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            setFormData(prev => ({
                ...prev,
                firstName: firstName || prev.firstName,
                lastName: lastName || prev.lastName,
                email: user.email || prev.email
            }));
        }
    }, [user]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
    };

    const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const tax = Math.floor(subtotal * 0.11);
    const total = subtotal + tax;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (cartItems.length === 0) {
            setError("Keranjang belanja Anda kosong.");
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const payload = {
                items: cartItems.map(item => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                    customizations: item.customizations || null
                })),
                payment_type: paymentMethod, // Even if backend ignores, we can pass it
            };

            const response = await api.post('/checkout', payload);
            
            // Success
            setOrderSuccess(response.data.data.order_number);
            clearCart();
        } catch (err) {
            console.error("Checkout failed:", err);
            setError(err.response?.data?.message || "Terjadi kesalahan saat memproses pesanan Anda.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (orderSuccess) {
        return (
            <main className="flex-grow w-full max-w-[1440px] mx-auto px-5 md:px-grid-margin py-section-gap-mobile md:py-section-gap-desktop animate-fade-in text-center">
                <div className="max-w-2xl mx-auto bg-surface-container-low/80 backdrop-blur-sm p-12 border border-outline-variant/30 rounded shadow-sm">
                    <span className="material-symbols-outlined text-6xl text-primary mb-6">check_circle</span>
                    <h1 className="font-display-lg-mobile md:font-display-lg text-on-background mb-4">Pesanan Berhasil!</h1>
                    <p className="font-body-lg text-on-surface-variant mb-2">Terima kasih atas pesanan Anda.</p>
                    <p className="font-body-md text-on-surface-variant mb-8">
                        Nomor Pesanan Anda adalah: <strong className="text-on-background font-headline-md block mt-2">{orderSuccess}</strong>
                    </p>
                    <Link to="/" className="inline-block bg-primary text-on-primary font-label-caps px-8 py-4 rounded hover:bg-primary-container transition-colors">
                        Kembali ke Beranda
                    </Link>
                </div>
            </main>
        );
    }

    if (cartItems.length === 0) {
        return (
            <main className="flex-grow w-full max-w-[1440px] mx-auto px-5 md:px-grid-margin py-section-gap-mobile md:py-section-gap-desktop text-center animate-fade-in">
                <h1 className="text-3xl md:text-4xl font-serif text-gray-900 mb-8 pb-4 border-b border-gray-200 text-center md:text-left">Checkout</h1>
                <p className="font-body-lg text-on-surface-variant mb-8">Keranjang Anda kosong, tidak ada yang dapat dicheckout.</p>
                <Link to="/menu" className="inline-block bg-primary text-on-primary font-label-caps px-8 py-4 rounded hover:bg-primary-container transition-colors">
                    Lihat Menu
                </Link>
            </main>
        );
    }

    return (
        <main className="relative z-10 max-w-[1440px] mx-auto px-5 md:px-gutter py-section-gap-mobile md:py-section-gap-desktop grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-grid-margin animate-fade-in">
            <div className="lg:col-span-10 lg:col-start-2 xl:col-span-8 xl:col-start-3">
                <h1 className="text-3xl md:text-4xl font-serif text-gray-900 mb-8 pb-4 border-b border-gray-200 text-center md:text-left">Checkout</h1>
                
                {error && (
                    <div className="bg-error-container text-on-error-container p-4 rounded mb-8 font-body-md">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-12">
                    
                    {/* Step 1: Informasi Kontak */}
                    <div className="relative">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary font-label-caps shrink-0">1</div>
                            <h2 className="font-headline-md text-on-surface">Informasi Kontak</h2>
                        </div>
                        <div className="pl-8 lg:pl-10 relative">
                            {/* Pick-up Badge */}
                            <div className="mb-8 flex items-center gap-3 bg-blue-50 text-blue-800 px-4 py-3 rounded-lg border border-blue-100 shadow-sm">
                                <span className="material-symbols-outlined text-blue-600">storefront</span>
                                <span className="font-semibold text-sm tracking-wide">Metode Pengambilan: Ambil di Kafe (Pick-up)</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="flex flex-col">
                                    <label className="font-label-caps text-on-surface-variant mb-2">Nama Depan</label>
                                    <input 
                                        type="text" 
                                        name="firstName"
                                        required
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="border-0 border-b border-outline-variant bg-transparent focus:border-primary focus:ring-0 px-0 py-2 font-body-md text-on-background placeholder:text-tertiary transition-colors" 
                                        placeholder="Masukkan nama depan" 
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="font-label-caps text-on-surface-variant mb-2">Nama Belakang</label>
                                    <input 
                                        type="text" 
                                        name="lastName"
                                        required
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="border-0 border-b border-outline-variant bg-transparent focus:border-primary focus:ring-0 px-0 py-2 font-body-md text-on-background placeholder:text-tertiary transition-colors" 
                                        placeholder="Masukkan nama belakang" 
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="font-label-caps text-on-surface-variant mb-2">Email</label>
                                    <input 
                                        type="email" 
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="border-0 border-b border-outline-variant bg-transparent focus:border-primary focus:ring-0 px-0 py-2 font-body-md text-on-background placeholder:text-tertiary transition-colors" 
                                        placeholder="nama@email.com" 
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="font-label-caps text-on-surface-variant mb-2">Telepon</label>
                                    <input 
                                        type="tel" 
                                        name="phone"
                                        required
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="border-0 border-b border-outline-variant bg-transparent focus:border-primary focus:ring-0 px-0 py-2 font-body-md text-on-background placeholder:text-tertiary transition-colors" 
                                        placeholder="+62 812-3456-7890" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Ringkasan Pesanan */}
                    <div className="relative">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-6 h-6 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface-variant font-label-caps shrink-0">2</div>
                            <h2 className="font-headline-md text-on-surface">Ringkasan Pesanan</h2>
                        </div>
                        <div className="pl-8 lg:pl-10 relative">
                            <div className="bg-surface-container-lowest border border-outline-variant rounded p-6 md:p-8">
                                {/* Items */}
                                <div className="space-y-6 mb-8">
                                    {cartItems.map((item, index) => (
                                        <React.Fragment key={item.product.id}>
                                            <div className="flex gap-4 items-center">
                                                <div className="w-16 h-16 bg-surface-variant rounded overflow-hidden shrink-0">
                                                    <img 
                                                        className="w-full h-full object-cover" 
                                                        src={getImageUrl(item.product.image_url)} 
                                                        alt={item.product.name} 
                                                    />
                                                </div>
                                                <div className="flex-grow">
                                                    <h3 className="font-body-md text-on-background">{item.product.name}</h3>
                                                    {item.customizations && (
                                                        <div className="text-xs text-gray-500 mt-1 mb-2">
                                                            {item.customizations.size && <span>Ukuran: {item.customizations.size} </span>}
                                                            {item.customizations.ice && <span>| Es: {item.customizations.ice} </span>}
                                                            {item.customizations.sugar && <span>| Gula: {item.customizations.sugar}</span>}
                                                        </div>
                                                    )}
                                                    <p className="font-body-md text-on-surface-variant">Qty: {item.quantity}</p>
                                                </div>
                                                <div className="font-body-md text-on-background whitespace-nowrap">
                                                    {formatPrice(item.product.price * item.quantity)}
                                                </div>
                                            </div>
                                            {index < cartItems.length - 1 && <div className="w-full h-px bg-surface-variant"></div>}
                                        </React.Fragment>
                                    ))}
                                </div>

                                {/* Totals Box */}
                                <div className="bg-surface-container p-6 rounded mb-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between font-body-md text-on-surface-variant">
                                            <span>Subtotal</span>
                                            <span>{formatPrice(subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between font-body-md text-on-surface-variant">
                                            <span>Pajak (11%)</span>
                                            <span>{formatPrice(tax)}</span>
                                        </div>
                                        <div className="w-full h-px bg-outline-variant my-2"></div>
                                        <div className="flex justify-between font-headline-md text-on-background">
                                            <span>Total</span>
                                            <span>{formatPrice(total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Pembayaran */}
                    <div className="relative">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-6 h-6 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface-variant font-label-caps shrink-0">3</div>
                            <h2 className="font-headline-md text-on-surface">Pembayaran</h2>
                        </div>
                        <div className="pl-8 lg:pl-10">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Payment Options */}
                                <div className="space-y-4">
                                    <label className="flex items-center cursor-pointer relative group">
                                        <input 
                                            type="radio" 
                                            name="payment" 
                                            value="QRIS"
                                            checked={paymentMethod === 'QRIS'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="peer sr-only" 
                                        />
                                        <div className={`w-full border ${paymentMethod === 'QRIS' ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'} p-4 rounded flex items-center justify-between transition-colors hover:border-primary`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border ${paymentMethod === 'QRIS' ? 'border-primary' : 'border-outline-variant'} flex items-center justify-center`}>
                                                    {paymentMethod === 'QRIS' && <div className="w-2.5 h-2.5 rounded-full bg-primary transition-colors"></div>}
                                                </div>
                                                <span className="font-body-md text-on-background">QRIS</span>
                                            </div>
                                            <span className={`material-symbols-outlined ${paymentMethod === 'QRIS' ? 'text-primary' : 'text-on-surface-variant'}`}>qr_code_scanner</span>
                                        </div>
                                    </label>
                                    
                                    <label className="flex items-center cursor-pointer relative group">
                                        <input 
                                            type="radio" 
                                            name="payment" 
                                            value="Virtual Account"
                                            checked={paymentMethod === 'Virtual Account'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="peer sr-only" 
                                        />
                                        <div className={`w-full border ${paymentMethod === 'Virtual Account' ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'} p-4 rounded flex items-center justify-between transition-colors hover:border-primary`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border ${paymentMethod === 'Virtual Account' ? 'border-primary' : 'border-outline-variant'} flex items-center justify-center`}>
                                                    {paymentMethod === 'Virtual Account' && <div className="w-2.5 h-2.5 rounded-full bg-primary transition-colors"></div>}
                                                </div>
                                                <span className="font-body-md text-on-background">Virtual Account Banks</span>
                                            </div>
                                            <span className={`material-symbols-outlined ${paymentMethod === 'Virtual Account' ? 'text-primary' : 'text-on-surface-variant'}`}>account_balance</span>
                                        </div>
                                    </label>
                                    
                                    <label className="flex items-center cursor-pointer relative group">
                                        <input 
                                            type="radio" 
                                            name="payment" 
                                            value="Cash"
                                            checked={paymentMethod === 'Cash'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="peer sr-only" 
                                        />
                                        <div className={`w-full border ${paymentMethod === 'Cash' ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'} p-4 rounded flex items-center justify-between transition-colors hover:border-primary`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border ${paymentMethod === 'Cash' ? 'border-primary' : 'border-outline-variant'} flex items-center justify-center`}>
                                                    {paymentMethod === 'Cash' && <div className="w-2.5 h-2.5 rounded-full bg-primary transition-colors"></div>}
                                                </div>
                                                <span className="font-body-md text-on-background">Cash on the cashier</span>
                                            </div>
                                            <span className={`material-symbols-outlined ${paymentMethod === 'Cash' ? 'text-primary' : 'text-on-surface-variant'}`}>payments</span>
                                        </div>
                                    </label>

                                    <div className="pt-8">
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            className="w-full bg-[#C06C53] text-[#FAFAF9] font-label-caps py-4 px-8 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'MEMPROSES...' : 'LANJUT PEMBAYARAN'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </main>
    );
};

export default Checkout;
