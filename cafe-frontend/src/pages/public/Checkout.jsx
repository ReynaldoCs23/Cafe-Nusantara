import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart, unitPriceOf } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { getImageUrl } from '../../utils/imageHelper';
import { apiErrorMessage, calculateTotals, formatPrice, modifierSummary, newIdempotencyKey, rememberOrder } from '../../utils/pos';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import PageIntro from '../../components/public/PageIntro';
import { Field, Icon, Segmented } from '../../components/ui';
import { useTableSession } from '../../hooks/useTableSession';
import { clearTableSession } from '../../utils/table';

const Step = ({ number, title, children }) => (
    <section className="py-10 border-t border-hairline first:border-t-0 first:pt-0">
        <div className="flex items-baseline gap-4 mb-6">
            <span className="font-display text-xl text-primary tabular">{String(number).padStart(2, '0')}</span>
            <h2 className="font-display text-2xl text-ink">{title}</h2>
        </div>
        {children}
    </section>
);

const Row = ({ label, value }) => (
    <div className="flex justify-between text-on-surface-variant">
        <span>{label}</span>
        <span className="tabular">{formatPrice(value)}</span>
    </div>
);

/** Checkout pelanggan: data pemesan, cara serah, dan pembayaran di kasir. */
const Checkout = () => {
    const { cartItems, clearCart, subtotal } = useCart();
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const settings = useStoreSettings();
    const table = useTableSession();

    const [form, setForm] = useState({ name: '', phone: '', notes: '' });
    const [fulfillment, setFulfillment] = useState('table');
    const [savePhone, setSavePhone] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    // Satu kunci per percobaan checkout: klik ganda / retry tidak membuat pesanan ganda
    const idempotencyKey = useRef(newIdempotencyKey());

    useEffect(() => {
        if (user) {
            setForm((prev) => ({ ...prev, name: prev.name || user.name || '', phone: prev.phone || user.phone_number || '' }));
        }
    }, [user]);

    const totals = calculateTotals(subtotal, settings);
    const storeClosed = settings && !settings.is_open;
    const payAtCashier = settings?.pay_at_cashier_enabled ?? true;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cartItems.length === 0 || isSubmitting) return;
        setIsSubmitting(true);
        setError('');

        try {
            if (user && !user.phone_number && savePhone && form.phone) {
                try {
                    const res = await api.put('/profile', { name: user.name, email: user.email, phone_number: form.phone });
                    if (res.data?.user) updateUser(res.data.user);
                } catch {
                    // gagal simpan profil tidak menghalangi pesanan
                }
            }

            const response = await api.post('/orders', {
                items: cartItems.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                    modifier_ids: (item.modifiers || []).map((m) => m.id),
                    notes: item.notes || null,
                })),
                customer_name: form.name.trim(),
                customer_phone: form.phone.trim() || null,
                notes: form.notes.trim() || null,
                table_token: table?.token || null,
                fulfillment: table ? fulfillment : 'pickup',
            }, { headers: { 'Idempotency-Key': idempotencyKey.current } });

            const { order_number: orderNumber } = response.data.data;
            const token = response.data.access_token;
            rememberOrder(orderNumber, token);
            clearCart();
            navigate(`/order/${orderNumber}?token=${encodeURIComponent(token)}`, { replace: true });
        } catch (err) {
            // QR meja dirotasi/dinonaktifkan sejak di-scan: lepas sesi meja agar pelanggan bisa tetap memesan
            if (err.response?.data?.errors?.table_token) clearTableSession();
            setError(apiErrorMessage(err, 'Terjadi kesalahan saat memproses pesanan Anda.'));
            if (err.response?.status === 422) idempotencyKey.current = newIdempotencyKey();
        } finally {
            setIsSubmitting(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className="pb-32">
                <PageIntro eyebrow="Checkout" title="Keranjang Anda kosong." description="Tambahkan menu terlebih dahulu sebelum memesan.">
                    <Link to="/menu" className="btn-primary btn-lg rounded-full px-8 mt-10 inline-flex">Lihat menu <Icon name="arrow_forward" /></Link>
                </PageIntro>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-32">
            <PageIntro eyebrow="Checkout" title="Hampir selesai." description="Lengkapi data Anda, lalu bayar di kasir saat pesanan dipanggil." />

            <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-5 md:px-10 grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-20 items-start">
                <div>
                    {storeClosed && (
                        <p className="mb-8 flex items-center gap-3 rounded-2xl bg-amber-soft border border-amber-200 px-5 py-4 text-sm text-amber-900">
                            <Icon name="schedule" /> Toko sedang tutup. Pesanan bisa dikirim lagi saat jam buka.
                        </p>
                    )}

                    <Step number={1} title="Data pemesan">
                        <div className="grid sm:grid-cols-2 gap-5">
                            <Field label="Nama (untuk dipanggil)">
                                <input className="input-lg" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama Anda" autoComplete="name" />
                            </Field>
                            <Field label="No. HP (opsional)">
                                <input className="input-lg" type="tel" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812-3456-7890" autoComplete="tel" />
                            </Field>
                            {user && !user.phone_number && form.phone && (
                                <label className="sm:col-span-2 flex items-center gap-2 text-sm text-on-surface-variant">
                                    <input type="checkbox" checked={savePhone} onChange={(e) => setSavePhone(e.target.checked)} /> Simpan nomor ini ke akun saya
                                </label>
                            )}
                            <Field label="Catatan pesanan (opsional)" className="sm:col-span-2">
                                <input className="input-lg" maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contoh: tolong dipisah per orang" />
                            </Field>
                        </div>
                    </Step>

                    <Step number={2} title="Cara penyerahan">
                        {table ? (
                            <div className="space-y-4">
                                <p className="flex items-center gap-3 text-on-surface-variant"><Icon name="table_restaurant" className="text-primary" /> Anda memesan dari <strong className="text-ink">{table.name}</strong></p>
                                <Segmented size="lg" value={fulfillment} onChange={setFulfillment} options={[['table', 'Antar ke meja', 'room_service'], ['pickup', 'Ambil di kasir', 'shopping_bag']]} />
                            </div>
                        ) : (
                            <p className="flex items-start gap-3 text-on-surface-variant leading-relaxed">
                                <Icon name="storefront" className="text-primary" />
                                <span>Pesanan diambil di kasir. Nomor antrean Anda akan tampil di layar dan dipanggil saat pesanan siap.</span>
                            </p>
                        )}
                    </Step>

                    <Step number={3} title="Pembayaran">
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-ink bg-paper p-5 flex gap-4">
                                <Icon name="point_of_sale" className="text-primary" />
                                <div>
                                    <p className="font-semibold text-ink">Bayar di kasir</p>
                                    <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                                        Sebutkan nomor pesanan, lalu bayar dengan tunai, QRIS, atau kartu debit.
                                        Pesanan mulai dibuat setelah lunas dan batal otomatis jika belum dibayar dalam {settings?.qr_payment_timeout_minutes ?? 15} menit.
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-hairline p-5 flex items-center gap-4 text-on-surface-variant">
                                <Icon name="qr_code_scanner" />
                                <p className="text-sm">Bayar online (QRIS, e-wallet, VA) segera hadir.</p>
                            </div>
                        </div>
                    </Step>
                </div>

                <aside className="card p-8 lg:sticky lg:top-28">
                    <h2 className="font-display text-2xl mb-6">Pesanan Anda</h2>
                    <ul className="space-y-5 max-h-[320px] overflow-y-auto scroll-thin pr-1">
                        {cartItems.map((item) => (
                            <li key={item.cartItemId} className="flex gap-4">
                                <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-surface-container">
                                    {item.product.image_url && <img src={getImageUrl(item.product.image_url)} alt="" className="h-full w-full object-cover" />}
                                    <span className="absolute -top-0 -right-0 h-6 min-w-6 px-1.5 rounded-bl-lg bg-ink text-cream text-xs font-semibold flex items-center justify-center tabular">{item.quantity}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium leading-snug">{item.product.name}</p>
                                    {item.modifiers?.length > 0 && <p className="text-xs text-on-surface-variant">{modifierSummary(item.modifiers)}</p>}
                                    {item.notes && <p className="text-xs italic text-on-surface-variant">“{item.notes}”</p>}
                                </div>
                                <span className="text-sm tabular">{formatPrice(unitPriceOf(item) * item.quantity)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="border-t border-hairline mt-6 pt-6 space-y-2.5 text-sm">
                        <Row label="Subtotal" value={totals.subtotal} />
                        {totals.service > 0 && <Row label="Service charge" value={totals.service} />}
                        <Row label={`Pajak PB1 ${totals.taxRate}%${totals.taxInclusive ? ' (termasuk)' : ''}`} value={totals.tax} />
                        {totals.rounding !== 0 && <Row label="Pembulatan" value={totals.rounding} />}
                    </div>
                    <div className="flex items-end justify-between border-t border-hairline mt-6 pt-6">
                        <span className="label-caps">Total</span>
                        <span className="font-display text-3xl tabular">{formatPrice(totals.total)}</span>
                    </div>

                    {error && <p className="mt-6 flex gap-2 rounded-xl bg-[#fff4f2] border border-error/25 px-4 py-3 text-sm text-error" role="alert"><Icon name="error" className="text-[18px]" />{error}</p>}

                    <button type="submit" disabled={isSubmitting || storeClosed || !payAtCashier} className="btn-primary btn-lg rounded-full w-full mt-8">
                        {isSubmitting ? 'Memproses...' : 'Kirim pesanan'}
                    </button>
                    <p className="text-xs text-on-surface-variant text-center mt-4">Total final dihitung ulang oleh sistem saat pesanan dikirim.</p>
                </aside>
            </form>
        </div>
    );
};

export default Checkout;
