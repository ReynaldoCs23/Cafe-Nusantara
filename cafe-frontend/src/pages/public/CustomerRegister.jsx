import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Field, Icon } from '../../components/ui';
import { apiErrorMessage, deviceName } from '../../utils/pos';

/** Pendaftaran akun pelanggan, tampilan selaras dengan halaman masuk. */
const CustomerRegister = () => {
    const [form, setForm] = useState({ name: '', username: '', email: '', password: '', password_confirmation: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        if (form.password !== form.password_confirmation) return setError('Konfirmasi kata sandi tidak cocok.');
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/register', { ...form, device_name: deviceName() });
            login(res.data.access_token, res.data.user);
            navigate('/');
        } catch (err) {
            setError(apiErrorMessage(err, 'Gagal mendaftar. Silakan coba lagi.'));
        } finally {
            setLoading(false);
        }
        return null;
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-cream text-ink">
            <aside className="hidden lg:flex relative overflow-hidden bg-espresso text-cream p-14 flex-col justify-between">
                <div className="absolute inset-0 opacity-[0.07] bg-[url('/bg-pattern.svg')] bg-repeat" aria-hidden="true" />
                <Link to="/" className="relative font-display text-3xl">Cafe Nusantara</Link>
                <div className="relative max-w-md space-y-6">
                    <p className="font-display text-5xl leading-[1.15]">Satu akun untuk setiap cangkir.</p>
                    <ul className="space-y-3 text-stone-300">
                        {['Lihat riwayat pesanan kapan saja', 'Data terisi otomatis saat memesan', 'Pantau status pesanan secara langsung'].map((t) => (
                            <li key={t} className="flex items-center gap-3"><Icon name="check" className="text-[18px] text-primary-fixed-dim" /> {t}</li>
                        ))}
                    </ul>
                </div>
                <p className="relative text-sm text-stone-400">Tanpa akun pun Anda tetap bisa memesan sebagai tamu.</p>
            </aside>

            <main className="flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-[440px] animate-slide-up">
                    <Link to="/" className="lg:hidden font-display text-2xl text-primary block mb-10">Cafe Nusantara</Link>
                    <p className="label-caps mb-3">Akun baru</p>
                    <h1 className="page-title mb-8">Buat akun pelanggan</h1>

                    <form onSubmit={submit} className="space-y-5">
                        <Field label="Nama lengkap"><input className="input-lg" required value={form.name} onChange={set('name')} autoComplete="name" autoFocus /></Field>
                        <div className="grid sm:grid-cols-2 gap-5">
                            <Field label="Username"><input className="input-lg" required value={form.username} onChange={set('username')} autoComplete="username" /></Field>
                            <Field label="Email"><input className="input-lg" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></Field>
                        </div>
                        <Field label="Password" hint="Minimal 8 karakter.">
                            <div className="relative">
                                <input className="input-lg pr-12" type={showPassword ? 'text' : 'password'} minLength={8} required value={form.password} onChange={set('password')} autoComplete="new-password" />
                                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-ink" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                                </button>
                            </div>
                        </Field>
                        <Field label="Ulangi password"><input className="input-lg" type={showPassword ? 'text' : 'password'} minLength={8} required value={form.password_confirmation} onChange={set('password_confirmation')} autoComplete="new-password" /></Field>

                        {error && <p className="flex items-start gap-2 rounded-lg bg-[#fff4f2] border border-error/25 px-4 py-3 text-sm text-error" role="alert"><Icon name="error" className="text-[18px]" /> {error}</p>}

                        <button type="submit" className="btn-primary btn-lg w-full" disabled={loading}>{loading ? 'Mendaftarkan...' : 'Daftar'}</button>
                    </form>

                    <p className="mt-8 text-sm text-on-surface-variant text-center">
                        Sudah punya akun? <Link to="/login" className="text-primary font-semibold hover:underline underline-offset-4">Masuk</Link>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default CustomerRegister;
