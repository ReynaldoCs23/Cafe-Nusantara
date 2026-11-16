import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { EmptyState, Field, Icon, LoadingBlock, Modal, PageHeader, Segmented, useToast } from '../../components/ui';
import { CHANNELS, apiErrorMessage, formatPrice } from '../../utils/pos';

const DAYS = [['mon', 'Sen'], ['tue', 'Sel'], ['wed', 'Rab'], ['thu', 'Kam'], ['fri', 'Jum'], ['sat', 'Sab'], ['sun', 'Min']];

const blank = {
    name: '', description: '', kind: 'auto', type: 'percent', value: '', buy_quantity: 2, get_quantity: 1, max_discount: '',
    scope: 'order', scope_ids: [], min_subtotal: '', channels: [], days: [], start_time: '', end_time: '',
    starts_on: '', ends_on: '', code: '', quota: '', is_active: true,
};

/** Data promo dari server -> isi form. */
const toForm = (p) => ({
    ...blank, ...p,
    kind: p.code ? 'voucher' : 'auto',
    value: p.value || '', max_discount: p.max_discount || '', min_subtotal: p.min_subtotal || '', quota: p.quota || '',
    scope_ids: p.scope_ids || [], channels: p.channels || [], days: p.days || [],
    start_time: p.start_time || '', end_time: p.end_time || '', starts_on: p.starts_on || '', ends_on: p.ends_on || '',
    code: p.code || '', description: p.description || '',
});

/** Isi form -> payload API. */
const toPayload = (form) => {
    const n = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
    return {
        name: form.name.trim(), description: form.description.trim() || null,
        type: form.type, value: form.type === 'bogo' ? null : n(form.value),
        buy_quantity: form.type === 'bogo' ? n(form.buy_quantity) : null,
        get_quantity: form.type === 'bogo' ? n(form.get_quantity) : null,
        max_discount: form.type === 'percent' ? n(form.max_discount) : null,
        scope: form.scope, scope_ids: form.scope === 'order' ? null : form.scope_ids,
        min_subtotal: n(form.min_subtotal) || 0,
        channels: form.channels, days: form.days,
        start_time: form.start_time || null, end_time: form.end_time || null,
        starts_on: form.starts_on || null, ends_on: form.ends_on || null,
        code: form.kind === 'voucher' ? form.code.trim() : null,
        quota: n(form.quota), is_active: form.is_active,
    };
};

const scheduleText = (p) => {
    const parts = [];
    if (p.days?.length) parts.push(DAYS.filter(([k]) => p.days.includes(k)).map(([, l]) => l).join(', '));
    if (p.start_time) parts.push(`${p.start_time}–${p.end_time}`);
    if (p.starts_on || p.ends_on) parts.push(`${p.starts_on || '…'} s/d ${p.ends_on || '…'}`);
    return parts.join(' · ') || 'Setiap saat';
};

/** Promo terjadwal & voucher (PRD PRM-02/03). */
const PromotionManagement = () => {
    const { notify } = useToast();
    const [promotions, setPromotions] = useState(null);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const [p, c, pr] = await Promise.all([api.get('/admin/promotions'), api.get('/admin/categories'), api.get('/admin/products')]);
        setPromotions(p.data.data);
        setCategories(c.data.data);
        setProducts(pr.data.data);
    }, []);

    useEffect(() => {
        load().catch((err) => notify(apiErrorMessage(err, 'Gagal memuat promo.'), 'error'));
    }, [load, notify]);

    const open = (p = null) => {
        setError('');
        setForm(p ? toForm(p) : { ...blank });
    };

    const toggleIn = (key, value) => setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        const payload = toPayload(form);
        try {
            if (form.id) await api.put(`/admin/promotions/${form.id}`, payload);
            else await api.post('/admin/promotions', payload);
            notify(form.id ? 'Promo diperbarui' : 'Promo dibuat');
            setForm(null);
            await load();
        } catch (err) {
            setError(apiErrorMessage(err, 'Gagal menyimpan promo.'));
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (p) => {
        try {
            await api.put(`/admin/promotions/${p.id}`, toPayload({ ...toForm(p), is_active: !p.is_active }));
            notify(p.is_active ? 'Promo dinonaktifkan' : 'Promo diaktifkan');
            await load();
        } catch (err) {
            notify(apiErrorMessage(err), 'error');
        }
    };

    const remove = async (p) => {
        if (!window.confirm(`Hapus promo ${p.name}? Riwayat pesanan tetap menyimpan nama promonya.`)) return;
        try {
            await api.delete(`/admin/promotions/${p.id}`);
            notify('Promo dihapus');
            await load();
        } catch (err) {
            notify(apiErrorMessage(err), 'error');
        }
    };

    if (!promotions) return <LoadingBlock />;

    const targets = form?.scope === 'category' ? categories : products;

    return (
        <div className="animate-fade-in">
            <PageHeader eyebrow="Bisnis" title="Promo & Voucher"
                description="Promo otomatis langsung terpasang di kasir, QR, dan online saat syaratnya terpenuhi. Voucher hanya berlaku jika kodenya dimasukkan. Satu pesanan mendapat satu promo dengan potongan terbesar."
                actions={<button className="btn-primary" onClick={() => open()}><Icon name="add" className="text-[18px]" /> Buat promo</button>} />

            {promotions.length === 0 ? (
                <div className="card"><EmptyState icon="sell" title="Belum ada promo" description="Buat promo pertama, mis. happy hour 14:00–16:00 diskon 20%." /></div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {promotions.map((p) => {
                        const exhausted = p.quota !== null && p.used_count >= p.quota;
                        return (
                            <article key={p.id} className={`card p-6 flex flex-col ${p.is_active ? '' : 'opacity-55'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="label-caps text-primary mb-1">{p.code ? `Voucher · ${p.code}` : 'Promo otomatis'}</p>
                                        <h3 className="font-display text-2xl leading-snug">{p.name}</h3>
                                    </div>
                                    <button type="button" role="switch" aria-checked={p.is_active} aria-label="Aktif" onClick={() => toggleActive(p)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${p.is_active ? 'bg-sage' : 'bg-surface-container-highest'}`}>
                                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${p.is_active ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                                <p className="mt-3 text-lg">{p.summary}</p>
                                <p className="text-sm text-on-surface-variant mt-1">
                                    {p.scope === 'order' ? 'Semua menu' : `${p.scope_ids?.length || 0} ${p.scope === 'category' ? 'kategori' : 'produk'}`}
                                    {p.min_subtotal ? ` · min. ${formatPrice(p.min_subtotal)}` : ''}
                                    {p.channels?.length ? ` · ${p.channels.map((c) => CHANNELS[c]).join(', ')}` : ''}
                                </p>
                                <p className="text-sm text-on-surface-variant flex items-center gap-1.5 mt-1"><Icon name="schedule" className="text-[16px]" /> {scheduleText(p)}</p>
                                <div className="mt-5 pt-4 border-t border-hairline grid grid-cols-3 gap-2 text-center text-sm">
                                    <div><p className="tabular font-semibold">{p.used_count}{p.quota ? `/${p.quota}` : ''}</p><p className="text-xs text-on-surface-variant">Dipakai</p></div>
                                    <div><p className="tabular font-semibold">{formatPrice(p.stats.discount)}</p><p className="text-xs text-on-surface-variant">Potongan</p></div>
                                    <div><p className="tabular font-semibold">{formatPrice(p.stats.revenue)}</p><p className="text-xs text-on-surface-variant">Penjualan</p></div>
                                </div>
                                {exhausted && <p className="mt-3 text-xs text-error">Kuota habis</p>}
                                <div className="mt-4 flex justify-end gap-1">
                                    <button className="btn-ghost text-xs" onClick={() => open(p)}><Icon name="edit" className="text-[16px]" /> Ubah</button>
                                    <button className="btn-ghost text-xs hover:text-error" onClick={() => remove(p)}><Icon name="delete" className="text-[16px]" /> Hapus</button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {form && (
                <Modal title={form.id ? 'Ubah promo' : 'Buat promo'} onClose={() => setForm(null)} size="xl"
                    footer={<><button className="btn-outline" onClick={() => setForm(null)}>Batal</button><button form="promo-form" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan promo'}</button></>}>
                    <form id="promo-form" onSubmit={save} className="grid lg:grid-cols-2 gap-x-10 gap-y-6">
                        <div className="space-y-5">
                            <Segmented value={form.kind} onChange={(kind) => setForm({ ...form, kind })} options={[['auto', 'Promo otomatis', 'bolt'], ['voucher', 'Voucher (pakai kode)', 'confirmation_number']]} />
                            <Field label="Nama promo"><input className="input" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mis. Happy hour sore" /></Field>
                            {form.kind === 'voucher' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Kode voucher"><input className="input uppercase tracking-wider" required maxLength={40} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\s/g, '') })} placeholder="NUSANTARA10" /></Field>
                                    <Field label="Kuota pemakaian" hint="Kosong = tanpa batas"><input className="input tabular" type="number" min="1" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} /></Field>
                                </div>
                            )}
                            <Field label="Keterangan (tampil ke pelanggan)"><input className="input" maxLength={255} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

                            <div>
                                <span className="label-caps block mb-2">Jenis potongan</span>
                                <Segmented value={form.type} onChange={(type) => setForm({ ...form, type, scope: type === 'bogo' && form.scope === 'order' ? 'category' : form.scope })}
                                    options={[['percent', 'Persen'], ['amount', 'Nominal'], ['bogo', 'Beli X gratis Y']]} />
                            </div>
                            {form.type === 'bogo' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Beli"><input className="input tabular" type="number" min="1" max="20" required value={form.buy_quantity} onChange={(e) => setForm({ ...form, buy_quantity: e.target.value })} /></Field>
                                    <Field label="Gratis" hint="Item termurah yang digratiskan"><input className="input tabular" type="number" min="1" max="20" required value={form.get_quantity} onChange={(e) => setForm({ ...form, get_quantity: e.target.value })} /></Field>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label={form.type === 'percent' ? 'Diskon (%)' : 'Potongan (Rp)'}><input className="input tabular" type="number" min="1" max={form.type === 'percent' ? 100 : undefined} required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></Field>
                                    {form.type === 'percent' && <Field label="Maks. potongan (Rp)" hint="Opsional"><input className="input tabular" type="number" min="1" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} /></Field>}
                                </div>
                            )}
                            <Field label="Minimal belanja (Rp)" hint="Opsional"><input className="input tabular" type="number" min="0" value={form.min_subtotal} onChange={(e) => setForm({ ...form, min_subtotal: e.target.value })} /></Field>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <span className="label-caps block mb-2">Berlaku untuk</span>
                                <Segmented value={form.scope} onChange={(scope) => setForm({ ...form, scope, scope_ids: [] })}
                                    options={[...(form.type === 'bogo' ? [] : [['order', 'Semua menu']]), ['category', 'Kategori'], ['product', 'Produk']]} />
                                {form.scope !== 'order' && (
                                    <div className="mt-3 flex flex-wrap gap-2 max-h-40 overflow-y-auto scroll-thin">
                                        {targets.map((t) => (
                                            <button type="button" key={t.id} onClick={() => toggleIn('scope_ids', t.id)}
                                                className={`chip py-1.5 px-3 text-xs ${form.scope_ids.includes(t.id) ? 'bg-ink text-cream border-ink' : 'border-hairline text-on-surface-variant'}`}>{t.name}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <span className="label-caps block mb-2">Hari <span className="normal-case tracking-normal font-normal">(kosong = setiap hari)</span></span>
                                <div className="flex flex-wrap gap-1.5">
                                    {DAYS.map(([key, label]) => (
                                        <button type="button" key={key} onClick={() => toggleIn('days', key)}
                                            className={`h-10 w-12 rounded-lg border text-sm ${form.days.includes(key) ? 'bg-ink text-cream border-ink' : 'border-hairline'}`}>{label}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Jam mulai" hint="Kosong = sepanjang hari"><input className="input" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></Field>
                                <Field label="Jam selesai"><input className="input" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></Field>
                                <Field label="Tanggal mulai"><input className="input" type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} /></Field>
                                <Field label="Tanggal berakhir"><input className="input" type="date" value={form.ends_on} min={form.starts_on || undefined} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} /></Field>
                            </div>
                            <div>
                                <span className="label-caps block mb-2">Kanal <span className="normal-case tracking-normal font-normal">(kosong = semua)</span></span>
                                <div className="flex gap-2">
                                    {Object.entries(CHANNELS).map(([key, label]) => (
                                        <button type="button" key={key} onClick={() => toggleIn('channels', key)}
                                            className={`chip py-1.5 px-3 text-xs ${form.channels.includes(key) ? 'bg-ink text-cream border-ink' : 'border-hairline text-on-surface-variant'}`}>{label}</button>
                                    ))}
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Promo aktif</label>
                        </div>
                        {error && <p className="lg:col-span-2 text-sm text-error" role="alert">{error}</p>}
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default PromotionManagement;
