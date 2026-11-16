import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, landingPathFor } from '../../context/AuthContext';
import api from '../../api/axios';
import { Field, Icon, Segmented } from '../../components/ui';
import { apiErrorMessage, deviceName } from '../../utils/pos';

/**
 * Halaman masuk untuk pelanggan dan staf.
 * Staf di perangkat bersama bisa masuk cepat memakai PIN.
 */
const Login = () => {
    const [mode, setMode] = useState('password');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = mode === 'pin'
                ? await api.post('/staff/pin-login', { username: username.trim(), pin, device_name: deviceName() })
                : await api.post('/login', { username: username.trim(), password, device_name: deviceName() });
            login(response.data.access_token, response.data.user);
            navigate(landingPathFor(response.data.user));
        } catch (err) {
            setError(apiErrorMessage(err, 'Gagal masuk. Periksa kembali data Anda.'));
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-cream text-ink">
            {/* Panel brand */}
            <aside className="hidden lg:flex relative overflow-hidden bg-espresso text-cream p-14 flex-col justify-between">
                <div className="absolute inset-0 opacity-[0.07] bg-[url('/bg-pattern.svg')] bg-repeat" aria-hidden="true" />
                <Link to="/" className="relative font-display text-3xl">Cafe Nusantara</Link>
                <div className="relative max-w-md">
                    <p className="label-caps text-stone-400 mb-5">Sejak secangkir pertama</p>
                    <p className="font-display text-5xl leading-[1.15]">Menyeduh ketenangan, melayani dengan sepenuh hati.</p>
                </div>
                <p className="relative text-sm text-stone-400">Kasir, dapur, dan pemesanan online dalam satu sistem.</p>
            </aside>

            {/* Form */}
            <main className="flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-[400px] animate-slide-up">
                    <Link to="/" className="lg:hidden font-display text-2xl text-primary block mb-10">Cafe Nusantara</Link>
                    <p className="label-caps mb-3">Selamat datang kembali</p>
                    <h1 className="page-title mb-2">Masuk ke akun Anda</h1>
                    <p className="text-on-surface-variant mb-8">Pelanggan dan staf masuk dari halaman yang sama.</p>

                    <div className="mb-8">
                        <Segmented value={mode} onChange={(m) => { setMode(m); setError(''); }} options={[
                            ['password', 'Username & password', 'key'],
                            ['pin', 'PIN staf', 'dialpad'],
                        ]} />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Field label="Username">
                            <input className="input-lg" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" autoFocus />
                        </Field>

                        {mode === 'password' ? (
                            <Field label="Password">
                                <div className="relative">
                                    <input className="input-lg pr-12" type={showPassword ? 'text' : 'password'} value={password}
                                        onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-ink"
                                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                                        <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                                    </button>
                                </div>
                            </Field>
                        ) : (
                            <Field label="PIN" hint="4–6 digit, diatur oleh owner di menu Pengguna.">
                                <input className="input-lg tracking-[0.6em] text-center tabular" type="password" inputMode="numeric" pattern="\d{4,6}" maxLength={6}
                                    value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} required autoComplete="off" />
                            </Field>
                        )}

                        {error && (
                            <p className="flex items-start gap-2 rounded-lg bg-[#fff4f2] border border-error/25 px-4 py-3 text-sm text-error" role="alert">
                                <Icon name="error" className="text-[18px]" /> {error}
                            </p>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
                            {loading ? 'Memeriksa...' : 'Masuk'}
                        </button>
                    </form>

                    {mode === 'password' && (
                        <p className="mt-8 text-sm text-on-surface-variant text-center">
                            Belum punya akun? <Link to="/register" className="text-primary font-semibold hover:underline underline-offset-4">Daftar sekarang</Link>
                        </p>
                    )}
                    <p className="mt-10 text-center">
                        <Link to="/" className="text-sm text-on-surface-variant hover:text-ink inline-flex items-center gap-1">
                            <Icon name="arrow_back" className="text-[16px]" /> Kembali ke beranda
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Login;
