import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';

const PublicLayout = () => {
    const { cartItems } = useCart();
    const { isAuthenticated, user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen flex flex-col font-body-md bg-[#F9F8F6] text-on-surface">
            
            {/* TopNavBar */}
            <nav className="w-full fixed top-0 z-50 bg-[#F9F8F6] border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
                    <Link to="/" onClick={closeMobileMenu} className="text-2xl font-bold text-primary tracking-tight z-50">
                        CafeNusantara
                    </Link>
                    
                    {/* Desktop Menu */}
                    <div className="hidden md:flex gap-8 items-center">
                        <Link to="/" className={`font-medium transition-colors duration-300 ${isActive('/') ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
                            Beranda
                        </Link>
                        <Link to="/menu" className={`font-medium transition-colors duration-300 ${isActive('/menu') ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
                            Menu
                        </Link>
                        <Link to="/reviews" className={`font-medium transition-colors duration-300 ${isActive('/reviews') ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
                            Ulasan
                        </Link>
                        <Link to="/about" className={`font-medium transition-colors duration-300 ${isActive('/about') ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
                            Tentang Kami
                        </Link>
                        <Link to="/locations" className={`font-medium transition-colors duration-300 ${isActive('/locations') ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
                            Lokasi
                        </Link>
                    </div>
                    
                    <div className="flex items-center gap-4 md:gap-6 z-50">
                        <Link to="/cart" onClick={closeMobileMenu} className="relative p-2 text-on-surface-variant hover:text-primary transition-colors duration-300 flex items-center">
                            <span className="material-symbols-outlined text-2xl">shopping_bag</span>
                            {cartItems.length > 0 && (
                                <span className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center border border-white">
                                    {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                                </span>
                            )}
                        </Link>
                        
                        {isAuthenticated ? (
                            <div className="hidden md:flex items-center gap-4 relative group">
                                <Link to={user?.role === 'admin' ? '/admin/dashboard' : '/profile'} onClick={closeMobileMenu} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg uppercase border border-primary/20">
                                        {user?.name ? user.name.charAt(0) : 'U'}
                                    </div>
                                </Link>
                                
                                {/* Dropdown */}
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 flex flex-col overflow-hidden">
                                    <div className="px-4 py-3 border-b border-gray-50">
                                        <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>
                                    <Link to={user?.role === 'admin' ? '/admin/dashboard' : '/profile'} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">person</span> Profil
                                    </Link>
                                    <button onClick={logout} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 text-left w-full">
                                        <span className="material-symbols-outlined text-[18px]">logout</span> Keluar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-4">
                                <Link to="/login" className="text-primary font-bold hover:text-[#7a3c28] transition-colors">Masuk</Link>
                                <Link to="/register" className="bg-primary text-white px-4 py-2 rounded-full font-bold hover:bg-[#7a3c28] transition-colors">Daftar</Link>
                            </div>
                        )}

                        {/* Hamburger Button */}
                        <button 
                            className="md:hidden p-2 text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <span className="material-symbols-outlined text-3xl">
                                {isMobileMenuOpen ? 'close' : 'menu'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-20 left-0 w-full bg-[#F9F8F6] border-b border-gray-200 shadow-lg flex flex-col py-4 px-6 gap-4 z-40 animate-fade-in">
                        <Link to="/" onClick={closeMobileMenu} className={`text-lg font-medium py-2 border-b border-gray-100 ${isActive('/') ? 'text-primary' : 'text-on-surface-variant'}`}>Beranda</Link>
                        <Link to="/menu" onClick={closeMobileMenu} className={`text-lg font-medium py-2 border-b border-gray-100 ${isActive('/menu') ? 'text-primary' : 'text-on-surface-variant'}`}>Menu</Link>
                        <Link to="/reviews" onClick={closeMobileMenu} className={`text-lg font-medium py-2 border-b border-gray-100 ${isActive('/reviews') ? 'text-primary' : 'text-on-surface-variant'}`}>Ulasan</Link>
                        <Link to="/about" onClick={closeMobileMenu} className={`text-lg font-medium py-2 border-b border-gray-100 ${isActive('/about') ? 'text-primary' : 'text-on-surface-variant'}`}>Tentang Kami</Link>
                        <Link to="/locations" onClick={closeMobileMenu} className={`text-lg font-medium py-2 border-b border-gray-100 ${isActive('/locations') ? 'text-primary' : 'text-on-surface-variant'}`}>Lokasi</Link>
                        
                        {isAuthenticated ? (
                            <>
                                <Link to={user?.role === 'admin' ? '/admin/dashboard' : '/profile'} onClick={closeMobileMenu} className="text-lg font-medium py-2 border-b border-gray-100 text-primary flex items-center gap-2">
                                    <span className="material-symbols-outlined">person</span> Profil ({user?.name})
                                </Link>
                                <button onClick={() => { logout(); closeMobileMenu(); }} className="text-lg font-medium py-2 text-red-600 flex items-center gap-2 text-left">
                                    <span className="material-symbols-outlined">logout</span> Keluar
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" onClick={closeMobileMenu} className="text-lg font-medium py-2 border-b border-gray-100 text-on-surface-variant">Masuk</Link>
                                <Link to="/register" onClick={closeMobileMenu} className="text-lg font-medium py-2 text-primary font-bold">Daftar Akun</Link>
                            </>
                        )}
                    </div>
                )}
            </nav>

            {/* Main Content Area */}
            <main className="flex-grow pt-20 w-full">
                <Outlet />
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default PublicLayout;
