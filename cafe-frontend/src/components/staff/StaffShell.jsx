import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { ROLES, apiErrorMessage, deviceName, landingPathFor } from '../../utils/pos';
import { Field, Icon, Modal, useToast } from '../ui';

// Layar operasional per peran (PRD bagian 4)
const SCREENS = [
    { to: '/pos', label: 'Kasir', icon: 'point_of_sale', roles: ['owner', 'manager', 'cashier'] },
    { to: '/kds', label: 'Bar & Dapur', icon: 'local_cafe', roles: ['owner', 'manager', 'cashier', 'barista'] },
    { to: '/antar', label: 'Serahkan', icon: 'room_service', roles: ['owner', 'manager', 'cashier', 'barista', 'waiter'] },
    { to: '/admin', label: 'Back-office', icon: 'dashboard', roles: ['owner', 'manager', 'cashier', 'barista', 'waiter'] },
];

const Clock = ({ dark }) => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 20000);
        return () => clearInterval(timer);
    }, []);
    return (
        <span className={`tabular text-sm ${dark ? 'text-stone-300' : 'text-on-surface-variant'}`}>
            {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </span>
    );
};

/** Ganti pengguna cepat di perangkat bersama memakai PIN (PRD bagian 4). */
export const PinSwitchModal = ({ onClose }) => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const res = await api.post('/staff/pin-login', { username: username.trim(), pin, device_name: deviceName() });
            login(res.data.access_token, res.data.user);
            onClose();
            navigate(landingPathFor(res.data.user));
        } catch (err) {
            setError(apiErrorMessage(err, 'Username atau PIN salah.'));
            setPin('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title="Ganti pengguna" subtitle="Masuk cepat dengan username dan PIN staf." onClose={onClose} size="sm">
            <form onSubmit={submit} className="space-y-4">
                <Field label="Username">
                    <input className="input-lg" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required autoComplete="off" />
                </Field>
                <Field label="PIN">
                    <input className="input-lg tracking-[0.5em] text-center" type="password" inputMode="numeric" pattern="\d{4,6}" maxLength={6}
                        value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} required autoComplete="off" />
                </Field>
                {error && <p className="text-sm text-error" role="alert">{error}</p>}
                <button type="submit" className="btn-primary btn-lg w-full" disabled={busy}>{busy ? 'Memeriksa...' : 'Masuk'}</button>
            </form>
        </Modal>
    );
};

/**
 * Kerangka layar operasional full-screen (kasir, bar/dapur, serahkan pesanan).
 * dark = tema gelap untuk layar dapur agar kontras dan tidak menyilaukan.
 */
const StaffShell = ({ dark = false }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { notify } = useToast();
    const [menuOpen, setMenuOpen] = useState(false);
    const [pinOpen, setPinOpen] = useState(false);

    const screens = SCREENS.filter((s) => s.roles.includes(user?.role));

    const handleLogout = async () => {
        try {
            await api.post('/logout');
        } catch {
            // abaikan
        }
        logout();
        notify('Anda telah keluar');
        navigate('/login');
    };

    return (
        <div className={`h-screen flex flex-col overflow-hidden ${dark ? 'bg-espresso text-stone-100' : 'bg-cream text-ink'}`}>
            <header className={`h-14 shrink-0 flex items-center gap-4 px-4 border-b ${dark ? 'border-espresso-3 bg-espresso-2' : 'border-hairline bg-paper'}`}>
                <div className="flex items-center gap-2 pr-2">
                    <span className={`font-display text-lg ${dark ? 'text-cream' : 'text-primary'}`}>Nusantara</span>
                </div>

                <nav className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                    {screens.map((s) => (
                        <NavLink
                            key={s.to}
                            to={s.to}
                            className={({ isActive }) => `flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                                isActive
                                    ? dark ? 'bg-cream text-espresso' : 'bg-ink text-cream'
                                    : dark ? 'text-stone-300 hover:text-white' : 'text-on-surface-variant hover:text-ink'
                            }`}
                        >
                            <Icon name={s.icon} className="text-[18px]" />
                            {s.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-4">
                    <Clock dark={dark} />
                    <div className="relative">
                        <button onClick={() => setMenuOpen((v) => !v)} className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border ${dark ? 'border-espresso-3 hover:border-stone-500' : 'border-hairline hover:border-ink/30'}`}>
                            <span className="h-7 w-7 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center">
                                {(user?.name || '?').slice(0, 1).toUpperCase()}
                            </span>
                            <span className="text-left leading-tight hidden sm:block">
                                <span className="block text-xs font-semibold">{user?.name}</span>
                                <span className={`block text-[10px] ${dark ? 'text-stone-400' : 'text-on-surface-variant'}`}>{ROLES[user?.role]}</span>
                            </span>
                        </button>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                                <div className="absolute right-0 mt-2 w-56 z-50 card py-2 text-ink animate-slide-up">
                                    <button onClick={() => { setMenuOpen(false); setPinOpen(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-container-low">
                                        <Icon name="switch_account" className="text-[20px]" /> Ganti pengguna (PIN)
                                    </button>
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-surface-container-low">
                                        <Icon name="logout" className="text-[20px]" /> Keluar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 min-h-0">
                <Outlet />
            </main>

            {pinOpen && <PinSwitchModal onClose={() => setPinOpen(false)} />}
        </div>
    );
};

export const ConnectionDot = ({ state, dark }) => (
    <span className={`flex items-center gap-1.5 text-xs ${dark ? 'text-stone-300' : 'text-on-surface-variant'}`} title={state === 'live' ? 'Realtime aktif' : 'Realtime terputus, memperbarui otomatis tiap beberapa detik'}>
        <span className={`h-2 w-2 rounded-full ${state === 'live' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
        {state === 'live' ? 'Live' : 'Polling'}
    </span>
);

export default StaffShell;
