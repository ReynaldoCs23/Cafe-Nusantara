import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { getImageUrl } from '../../utils/imageHelper';

const Cart = () => {
    const { cartItems, updateQuantity, removeFromCart } = useCart();
    const navigate = useNavigate();

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
    };

    const subtotal = cartItems.reduce((acc, item) => {
        const itemPrice = item.product.price + (item.customizations?.size === 'Large' ? 5000 : 0);
        return acc + (itemPrice * item.quantity);
    }, 0);
    const tax = Math.floor(subtotal * 0.11);
    const total = subtotal + tax;

    if (cartItems.length === 0) {
        return (
            <main className="flex-grow w-full max-w-[1440px] mx-auto px-5 md:px-grid-margin py-section-gap-mobile md:py-section-gap-desktop text-center animate-fade-in">
                <h1 className="text-3xl md:text-4xl font-serif text-gray-900 mb-8 pb-4 border-b border-gray-200 text-center md:text-left">Keranjang Belanja</h1>
                <p className="font-body-lg text-on-surface-variant mb-8">Keranjang Anda masih kosong.</p>
                <Link to="/menu" className="inline-block bg-primary text-on-primary font-label-caps px-8 py-4 rounded hover:bg-primary-container transition-colors">
                    Lihat Menu
                </Link>
            </main>
        );
    }

    return (
        <main className="flex-grow w-full max-w-[1440px] mx-auto px-5 md:px-grid-margin py-section-gap-mobile md:py-section-gap-desktop animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-serif text-gray-900 mb-8 pb-4 border-b border-gray-200 text-center md:text-left">Keranjang Belanja</h1>
            
            <div className="flex flex-col lg:flex-row gap-gutter lg:gap-[80px]">
                {/* Cart Items List */}
                <div className="flex-grow">
                    <div className="flex flex-col gap-8">
                        {cartItems.map((item) => (
                            <div key={item.cartItemId} className="flex items-center gap-6 py-8 border-b border-outline-variant/30 relative group">
                                <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 bg-surface-container-high rounded overflow-hidden">
                                    <img 
                                        className="w-full h-full object-cover" 
                                        src={getImageUrl(item.product.image_url)} 
                                        alt={item.product.name} 
                                    />
                                </div>
                                <div className="flex-grow flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-headline-md text-on-background mb-2">{item.product.name}</h3>
                                        {item.customizations && (
                                            <div className="text-xs text-gray-500 mb-2">
                                                {item.customizations.size && <span>Ukuran: {item.customizations.size} </span>}
                                                {item.customizations.ice && <span>| Es: {item.customizations.ice} </span>}
                                                {item.customizations.sugar && <span>| Gula: {item.customizations.sugar}</span>}
                                            </div>
                                        )}
                                        <p className="font-body-md text-on-surface-variant mb-4 md:mb-0 line-clamp-2">{item.product.description}</p>
                                    </div>
                                    <div className="flex items-center gap-6 md:gap-12">
                                        <div className="flex items-center border border-surface-variant rounded bg-surface/50">
                                            <button 
                                                onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                                                className="px-3 py-1 text-tertiary hover:text-on-surface transition-colors focus:outline-none"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">remove</span>
                                            </button>
                                            <span className="font-label-sm px-3 min-w-[32px] text-center">{item.quantity}</span>
                                            <button 
                                                onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                                                className="px-3 py-1 text-tertiary hover:text-on-surface transition-colors focus:outline-none"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">add</span>
                                            </button>
                                        </div>
                                        <span className="font-body-md text-primary font-medium w-24 text-right">
                                            {formatPrice((item.product.price + (item.customizations?.size === 'Large' ? 5000 : 0)) * item.quantity)}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => removeFromCart(item.cartItemId)}
                                    className="absolute top-6 right-0 md:static text-tertiary hover:text-error transition-colors focus:outline-none"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order Summary Sidebar */}
                <aside className="w-full lg:w-[380px] shrink-0">
                    <div className="bg-surface-container-low/80 backdrop-blur-sm p-10 border border-outline-variant/30 rounded shadow-sm">
                        <h2 className="font-headline-md text-on-surface mb-6">Ringkasan Pesanan</h2>
                        <div className="flex flex-col gap-4 mb-8">
                            <div className="flex justify-between font-body-md text-on-surface-variant">
                                <span>Subtotal</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            <div className="flex justify-between font-body-md text-on-surface-variant">
                                <span>Pajak (11%)</span>
                                <span>{formatPrice(tax)}</span>
                            </div>
                            <div className="w-full h-px bg-surface-variant my-2"></div>
                            <div className="flex justify-between font-headline-md text-primary">
                                <span>Total</span>
                                <span>{formatPrice(total)}</span>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => navigate('/checkout')}
                            className="w-full bg-primary text-on-primary font-label-caps uppercase tracking-widest py-5 rounded hover:bg-primary-container transition-all duration-300 shadow-sm"
                        >
                            Lanjut ke Pembayaran
                        </button>
                    </div>
                </aside>
            </div>
        </main>
    );
};

export default Cart;
