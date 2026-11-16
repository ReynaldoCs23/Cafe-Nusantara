import { useEffect, useState } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth, landingPathFor } from '../context/AuthContext';
import { Icon } from './ui';
import Footer from './Footer';
import TableBanner from './public/TableBanner';
import OrderTracker from './public/OrderTracker';
import { useTableSession } from '../hooks/useTableSession';

const LINKS = [
    ['/', 'Beranda'],
    ['/menu', 'Menu'],
    ['/about', 'Cerita Kami'],
    ['/reviews', 'Ulasan'],
    ['/locations', 'Kunjungi'],
];

/** Kerangka situs publik: header tipis bergaya editorial, menu seluler, footer. */
const PublicLayout = () => {
    const { itemCount } = useCart();
    const { isAuthenticated, user, logout, isStaff } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const table = useTableSession();

    useEffect(() => {
        setMobileOpen(false);
        setAccountOpen(false);
        window.scrollTo({ top: 0 });
    }, [location.pathname]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const accountPath = isStaff ? landingPathFor(user) : '/profile';
    const navClass = ({ isActive }) => `text-[12px] font-semibold uppercase tracking-[0.16em] py-1.5 border-b transition-colors duration-300 ${
        isActive ? 'text-ink border-primary' : 'text-on-surface-variant border-transparent hover:text-ink'
    }`;

    return (
        <div className="min-h-screen flex flex-col bg-cream text-ink">
            <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${scrolled || mobileOpen ? 'bg-cream/95 backdrop-blur border-b border-hairline' : 'bg-cream/70 backdrop-blur-sm border-b border-transparent'}`}>
                <div className="max-w-7xl mx-auto px-5 md:px-10 h-20 flex items-center justify-between gap-6">
                    <Link to="/" className="font-display text-[26px] leading-none text-ink">
                        Cafe <span className="text-primary">Nusantara</span>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-9" aria-label="Navigasi utama">
                        {LINKS.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={navClass}>{label}</NavLink>)}
                    </nav>

                    <div className="flex items-center gap-2 md:gap-4">
                        <Link to="/cart" className="relative h-11 w-11 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors" aria-label={`Keranjang, ${itemCount} item`}>
                            <Icon name="shopping_bag" className="text-[24px]" />
                            {itemCount > 0 && (
                                <span className="absolute top-1 right-0.5 h-5 min-w-5 px-1 rounded-full bg-primary text-white text-[11px] font-semibold flex items-center justify-center tabular">{itemCount}</span>
                            )}
                        </Link>

                        {isAuthenticated ? (
                            <div className="relative hidden md:block">
                                <button onClick={() => setAccountOpen((v) => !v)} className="flex items-center gap-2 rounded-full border border-hairline pl-1 pr-3 py-1 hover:border-ink/30" aria-expanded={accountOpen}>
                                    <span className="h-8 w-8 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center">{(user?.name || 'U').charAt(0).toUpperCase()}</span>
                                    <span className="text-sm font-medium max-w-[120px] truncate">{user?.name?.split(' ')[0]}</span>
                                    <Icon name="expand_more" className="text-[18px] text-on-surface-variant" />
                                </button>
                                {accountOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
                                        <div className="absolute right-0 mt-3 w-60 z-50 card py-2 animate-slide-up">
                                            <div className="px-4 py-3 border-b border-hairline">
                                                <p className="text-sm font-semibold truncate">{user?.name}</p>
                                                <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
                                            </div>
                                            <Link to={accountPath} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-container-low">
                                                <Icon name={isStaff ? 'dashboard' : 'person'} className="text-[20px]" /> {isStaff ? 'Buka layar kerja' : 'Akun & pesanan saya'}
                                            </Link>
                                            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-surface-container-low">
                                                <Icon name="logout" className="text-[20px]" /> Keluar
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-2">
                                <Link to="/login" className="btn-ghost">Masuk</Link>
                                <Link to="/menu" className="btn-primary">Pesan sekarang</Link>
                            </div>
                        )}

                        <button className="lg:hidden h-11 w-11 flex items-center justify-center rounded-full hover:bg-surface-container" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu" aria-expanded={mobileOpen}>
                            <Icon name={mobileOpen ? 'close' : 'menu'} className="text-[26px]" />
                        </button>
                    </div>
                </div>

                {table && <TableBanner table={table} />}

                {mobileOpen && (
                    <nav className="lg:hidden border-t border-hairline bg-cream px-5 pb-8 pt-4 animate-slide-up" aria-label="Navigasi seluler">
                        {LINKS.map(([to, label]) => (
                            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center justify-between py-4 border-b border-hairline font-display text-2xl ${isActive ? 'text-primary' : 'text-ink'}`}>
                                {label} <Icon name="arrow_forward" className="text-[20px] text-on-surface-variant" />
                            </NavLink>
                        ))}
                        <div className="grid grid-cols-2 gap-3 mt-6">
                            {isAuthenticated ? (
                                <>
                                    <Link to={accountPath} className="btn-outline">{isStaff ? 'Layar kerja' : 'Akun saya'}</Link>
                                    <button onClick={logout} className="btn-outline text-error">Keluar</button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="btn-outline">Masuk</Link>
                                    <Link to="/register" className="btn-primary">Daftar</Link>
                                </>
                            )}
                        </div>
                    </nav>
                )}
            </header>

            <main className={`flex-grow w-full ${table ? 'pt-[124px]' : 'pt-20'}`}>
                <Outlet />
            </main>

            <Footer />
            <OrderTracker />
        </div>
    );
};

export default PublicLayout;
