import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import PageIntro from '../../components/public/PageIntro';
import { EmptyState, Field, Icon, Spinner, StatusBadge } from '../../components/ui';
import { CHANNELS, apiErrorMessage, formatDateTime, formatPrice, modifierSummary } from '../../utils/pos';

/** Akun pelanggan: data profil dan riwayat pesanan. */
const Profile = () => {
    const { user, token, updateUser } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState('orders');
    const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone_number: user?.phone_number || '', password: '', password_confirmation: '' });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [orders, setOrders] = useState(null);
    const [loyalty, setLoyalty] = useState(null);

    useEffect(() => {
        if (!user || !token) navigate('/login');
    }, [user, token, navigate]);

    useEffect(() => {
        if (!token || user?.role !== 'customer') return;
        api.get('/my-loyalty').then((res) => setLoyalty(res.data.data)).catch(() => setLoyalty(null));
    }, [token, user?.role]);

    useEffect(() => {
        if (tab !== 'orders' || !token) return;
        api.get('/my-orders').then((res) => setOrders(res.data.data)).catch(() => setOrders([]));
    }, [tab, token]);

    const save = async (e) => {
        e.preventDefault();
        if (form.password && form.password !== form.password_confirmation) {
            return setMessage({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' });
        }
        setSaving(true);
        setMessage(null);
        try {
            const res = await api.put('/profile', { ...form, phone_number: form.phone_number || null });
            updateUser(res.data.user);
            setForm((f) => ({ ...f, password: '', password_confirmation: '' }));
            setMessage({ type: 'success', text: 'Profil berhasil diperbarui.' });
        } catch (err) {
            setMessage({ type: 'error', text: apiErrorMessage(err, 'Gagal memperbarui profil.') });
        } finally {
            setSaving(false);
        }
        return null;
    };

    if (!user) return null;

    return (
        <div className="animate-fade-in pb-32">
            <PageIntro eyebrow="Akun saya" title={`Halo, ${user.name.split(' ')[0]}.`} description="Pantau pesanan dan kelola data akun Anda." />

            <div className="max-w-5xl mx-auto px-5 md:px-10">
                {loyalty?.enabled && (
                    <section className="mb-10 rounded-3xl bg-espresso text-cream p-8 flex flex-wrap items-end justify-between gap-6">
                        <div>
                            <p className="label-caps text-stone-400">Poin member</p>
                            <p className="font-display text-6xl tabular mt-2">{loyalty.points}</p>
                            <p className="text-sm text-stone-300 mt-2">
                                Setara {formatPrice(loyalty.points * loyalty.settings.loyalty_point_value)} · dapat 1 poin setiap belanja {formatPrice(loyalty.settings.loyalty_earn_amount)}
                            </p>
                        </div>
                        <p className="text-sm text-stone-300 max-w-xs">
                            Tukar minimal {loyalty.settings.loyalty_min_redeem} poin saat checkout atau sebutkan no. HP Anda di kasir. Poin menutup maksimal {loyalty.settings.loyalty_max_redeem_percent}% belanja.
                        </p>
                    </section>
                )}

                <div className="flex gap-1.5 mb-10 border-b border-hairline">
                    {[['orders', 'Riwayat pesanan'], ...(loyalty?.enabled ? [['points', 'Riwayat poin']] : []), ['profile', 'Data akun']].map(([key, label]) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-primary text-ink' : 'border-transparent text-on-surface-variant hover:text-ink'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'orders' && (
                    !orders ? <div className="py-20 flex justify-center text-on-surface-variant"><Spinner /></div>
                        : orders.length === 0 ? (
                            <EmptyState icon="receipt_long" title="Belum ada pesanan" description="Pesanan yang Anda buat saat masuk akan tercatat di sini."
                                action={<Link to="/menu" className="btn-primary rounded-full px-6">Lihat menu</Link>} />
                        ) : (
                            <ul className="space-y-4">
                                {orders.map((order) => (
                                    <li key={order.id} className="card p-6">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <Link to={`/order/${order.order_number}?token=${encodeURIComponent(order.access_token || '')}`} className="font-display text-2xl hover:text-primary">
                                                    #{order.queue_number} · {order.order_number}
                                                </Link>
                                                <p className="text-sm text-on-surface-variant mt-1">{formatDateTime(order.created_at)} · {CHANNELS[order.channel]}</p>
                                            </div>
                                            <div className="text-right">
                                                <StatusBadge status={order.status} />
                                                <p className="font-display text-xl tabular mt-2">{formatPrice(order.grand_total)}</p>
                                            </div>
                                        </div>
                                        <ul className="mt-5 pt-5 border-t border-hairline space-y-2 text-sm">
                                            {order.items.filter((i) => i.status !== 'voided').map((item) => (
                                                <li key={item.id} className="flex justify-between gap-4">
                                                    <span>
                                                        {item.quantity}× {item.product_name}
                                                        {item.modifiers?.length > 0 && <span className="text-on-surface-variant"> · {modifierSummary(item.modifiers)}</span>}
                                                    </span>
                                                    <span className="tabular text-on-surface-variant">{formatPrice(item.line_total)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {!['completed', 'cancelled'].includes(order.status) && (
                                            <Link to={`/order/${order.order_number}?token=${encodeURIComponent(order.access_token || '')}`}
                                                className="mt-5 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] border-b border-primary pb-1 hover:text-primary">
                                                Lacak pesanan <Icon name="arrow_forward" className="text-[16px]" />
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )
                )}

                {tab === 'points' && loyalty && (
                    loyalty.transactions.length === 0 ? <EmptyState icon="loyalty" title="Belum ada riwayat poin" description="Poin bertambah setiap kali pesanan Anda dibayar." /> : (
                        <ul className="card divide-y divide-hairline">
                            {loyalty.transactions.map((t) => (
                                <li key={t.id} className="flex items-center justify-between gap-4 px-6 py-4">
                                    <div>
                                        <p className="font-medium">{t.note || t.type}</p>
                                        <p className="text-xs text-on-surface-variant">{formatDateTime(t.created_at)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold tabular ${t.points >= 0 ? 'text-sage' : 'text-error'}`}>{t.points >= 0 ? '+' : ''}{t.points}</p>
                                        <p className="text-xs text-on-surface-variant tabular">Saldo {t.balance_after}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )
                )}

                {tab === 'profile' && (
                    <form onSubmit={save} className="max-w-2xl space-y-6">
                        <div className="grid sm:grid-cols-2 gap-5">
                            <Field label="Nama lengkap" className="sm:col-span-2"><input className="input-lg" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                            <Field label="Email"><input className="input-lg" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                            <Field label="No. HP"><input className="input-lg" type="tel" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></Field>
                        </div>
                        <div className="border-t border-hairline pt-6">
                            <p className="font-display text-xl mb-1">Ubah kata sandi</p>
                            <p className="text-sm text-on-surface-variant mb-5">Biarkan kosong jika tidak ingin mengubah.</p>
                            <div className="grid sm:grid-cols-2 gap-5">
                                <Field label="Kata sandi baru"><input className="input-lg" type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></Field>
                                <Field label="Ulangi kata sandi"><input className="input-lg" type="password" minLength={8} value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} autoComplete="new-password" /></Field>
                            </div>
                        </div>
                        {message && <p className={`text-sm rounded-xl px-4 py-3 ${message.type === 'success' ? 'bg-sage-soft text-sage' : 'bg-[#fff4f2] text-error'}`} role="status">{message.text}</p>}
                        <button className="btn-primary btn-lg rounded-full px-10" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan perubahan'}</button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Profile;
