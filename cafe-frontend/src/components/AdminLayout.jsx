import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminLayout = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinkClass = (path) => {
        const isActive = location.pathname.includes(path);
        return `flex items-center gap-3 px-4 py-3 font-label-caps text-label-caps transition-colors duration-200 rounded ${
            isActive 
            ? 'text-primary dark:text-primary-fixed font-bold border-l-4 border-primary bg-surface-container-low' 
            : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest'
        }`;
    };

    return (
        <div className="bg-surface-container-lowest flex min-h-screen font-body-md text-on-surface antialiased">
            {/* SideNavBar */}
            <aside className="bg-surface h-screen w-64 fixed left-0 top-0 border-r border-outline-variant z-50 flex flex-col py-8 px-4 transition-all duration-300">
                <div className="mb-12 px-4">
                    <h2 className="font-headline-md text-headline-md text-primary">CafeNusantara</h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Admin Terminal</p>
                </div>
                <nav className="flex-1 space-y-2">
                    <Link to="/admin/dashboard" className={navLinkClass('/admin/dashboard')}>
                        <span className="material-symbols-outlined">dashboard</span>
                        Dashboard
                    </Link>
                    <Link to="/admin/reports" className={navLinkClass('/admin/reports')}>
                        <span className="material-symbols-outlined">bar_chart</span>
                        Laporan
                    </Link>
                    <Link to="/admin/orders" className={navLinkClass('/admin/orders')}>
                        <span className="material-symbols-outlined">shopping_cart</span>
                        Order Management
                    </Link>
                    <Link to="/admin/catalog" className={navLinkClass('/admin/catalog')}>
                        <span className="material-symbols-outlined">inventory_2</span>
                        Catalog & Inventory
                    </Link>
                    <Link to="/admin/content" className={navLinkClass('/admin/content') + ' ' + (location.pathname.startsWith('/admin/reviews') ? 'text-primary dark:text-primary-fixed font-bold border-r-2 border-primary bg-surface-container-low dark:bg-surface-dim' : '')}>
                        <span className="material-symbols-outlined">rate_review</span>
                        Content & Reviews
                    </Link>
                    <Link to="/admin/users" className={navLinkClass('/admin/users')}>
                        <span className="material-symbols-outlined">group</span>
                        User Management
                    </Link>
                </nav>
                <div className="mt-auto px-4 pt-8">
                    <button 
                        onClick={handleLogout}
                        className="w-full bg-error text-on-error py-3 px-4 rounded font-label-caps text-label-caps hover:bg-error-container hover:text-on-error-container transition-colors duration-300 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* TopAppBar */}
                <header className="bg-surface border-b border-outline-variant h-16 px-gutter flex justify-between items-center z-40 sticky top-0 transition-all">
                    <div className="flex items-center gap-4">
                        <h1 className="font-headline-md text-headline-md text-primary font-bold">Admin Console</h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-all flex items-center justify-center">
                                <span className="material-symbols-outlined">notifications</span>
                            </button>
                        </div>
                        <img alt="Admin User" className="w-8 h-8 rounded-full object-cover border border-outline-variant" src="https://ui-avatars.com/api/?name=Admin&background=914730&color=fff" />
                    </div>
                </header>

                {/* Main Canvas */}
                <main className="flex-1 p-gutter bg-background">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
