import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { ROLES } from '../utils/pos';
import { Icon } from './ui';
import { PinSwitchModal } from './staff/StaffShell';

// Navigasi back-office dikelompokkan per kebutuhan kerja (PRD bagian 4)
const NAV = [
    {
        title: 'Operasional',
        items: [
            { to: '/pos', icon: 'point_of_sale', label: 'Kasir', roles: ['owner', 'manager', 'cashier'], external: true },
            { to: '/kds', icon: 'local_cafe', label: 'Bar & Dapur', roles: ['owner', 'manager', 'cashier', 'barista'], external: true },
            { to: '/antar', icon: 'room_service', label: 'Serahkan Pesanan', roles: ['owner', 'manager', 'cashier', 'barista', 'waiter'], external: true },
            { to: '/admin/orders', icon: 'receipt_long', label: 'Semua Pesanan', roles: ['owner', 'manager', 'cashier', 'barista', 'waiter'] },
        ],
    },
    {
        title: 'Bisnis',
        items: [
            { to: '/admin/dashboard', icon: 'space_dashboard', label: 'Ringkasan', roles: ['owner', 'manager'] },
            { to: '/admin/reports', icon: 'monitoring', label: 'Laporan', roles: ['owner', 'manager'] },
            { to: '/admin/promotions', icon: 'sell', label: 'Promo & Voucher', roles: ['owner', 'manager'] },
            { to: '/admin/shifts', icon: 'account_balance_wallet', label: 'Riwayat Shift', roles: ['owner', 'manager'] },
            { to: '/admin/audit', icon: 'history', label: 'Log Aktivitas', roles: ['owner', 'manager'] },
        ],
    },
    {
        title: 'Toko',
        items: [
            { to: '/admin/catalog', icon: 'restaurant_menu', label: 'Menu & Stok', roles: ['owner', 'manager'] },
            { to: '/admin/tables', icon: 'table_restaurant', label: 'Meja & QR', roles: ['owner', 'manager'] },
            { to: '/admin/content', icon: 'web', label: 'Konten Website', roles: ['owner', 'manager'] },
            { to: '/admin/users', icon: 'badge', label: 'Pengguna', roles: ['owner'] },
            { to: '/admin/settings', icon: 'tune', label: 'Pengaturan', roles: ['owner'] },
        ],
    },
];

const AdminLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [pinOpen, setPinOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await api.post('/logout');
        } catch {
            // token mungkin sudah kedaluwarsa
        }
        logout();
        navigate('/login');
    };

    const linkClass = ({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive ? 'bg-ink text-cream' : 'text-on-surface-variant hover:bg-surface-container hover:text-ink'
    }`;

    return (
        <div className="min-h-screen flex bg-cream text-ink">
            <aside className="w-64 shrink-0 fixed inset-y-0 left-0 z-40 flex flex-col border-r border-hairline bg-paper">
                <div className="px-6 pt-7 pb-6">
                    <p className="font-display text-2xl text-primary leading-none">Nusantara</p>
                    <p className="label-caps mt-1.5">Back-office</p>
                </div>

                <nav className="flex-1 overflow-y-auto scroll-thin px-3 space-y-6 pb-6">
                    {NAV.map((group) => {
                        const items = group.items.filter((item) => item.roles.includes(user?.role));
                        if (items.length === 0) return null;
                        return (
                            <div key={group.title}>
                                <p className="label-caps px-3 mb-2 text-on-surface-variant/70">{group.title}</p>
                                <div className="space-y-0.5">
                                    {items.map((item) => (
                                        <NavLink key={item.to} to={item.to} className={linkClass}>
                                            <Icon name={item.icon} className="text-[20px]" />
                                            <span className="flex-1">{item.label}</span>
                                            {item.external && <Icon name="open_in_full" className="text-[14px] opacity-0 group-hover:opacity-60" />}
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                <div className="border-t border-hairline p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="h-9 w-9 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center">
                            {(user?.name || '?').slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{user?.name}</p>
                            <p className="text-xs text-on-surface-variant">{ROLES[user?.role] || user?.role}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setPinOpen(true)} className="btn-outline text-xs py-2" title="Ganti pengguna dengan PIN">
                            <Icon name="switch_account" className="text-[16px]" /> Ganti
                        </button>
                        <button onClick={handleLogout} className="btn-outline text-xs py-2 hover:border-error hover:text-error">
                            <Icon name="logout" className="text-[16px]" /> Keluar
                        </button>
                    </div>
                </div>
            </aside>

            <div className="flex-1 ml-64 min-w-0">
                <main className="px-10 py-10 max-w-[1400px]">
                    <Outlet />
                </main>
            </div>

            {pinOpen && <PinSwitchModal onClose={() => setPinOpen(false)} />}
        </div>
    );
};

export default AdminLayout;
