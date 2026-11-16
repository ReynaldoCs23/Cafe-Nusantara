import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { EmptyState, Field, Icon, LoadingBlock, Modal, PageHeader, useToast } from '../../components/ui';
import { apiErrorMessage, formatPrice } from '../../utils/pos';
import CategoryPanel from './catalog/CategoryPanel';
import ModifierGroupPanel from './catalog/ModifierGroupPanel';

const emptyProduct = (categoryId = '') => ({
    name: '', sku: '', category_id: categoryId, price: '', station: 'bar',
    track_stock: true, stock_quantity: 0, is_active: true, is_available: true, is_recommended: false,
    description: '', sort_order: 0, modifier_group_ids: [], image: null,
});

const BOOLEAN_FIELDS = ['track_stock', 'is_active', 'is_available', 'is_recommended'];

const Switch = ({ checked, onChange, label }) => (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-sage' : 'bg-surface-container-highest'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
);

/** Produk, stok, kategori, dan grup pilihan. */
const CatalogManagement = () => {
    const { notify } = useToast();
    const [tab, setTab] = useState('products');
    const [products, setProducts] = useState(null);
    const [categories, setCategories] = useState([]);
    const [groups, setGroups] = useState([]);
    const [filterCategory, setFilterCategory] = useState('all');
    const [query, setQuery] = useState('');
    const [form, setForm] = useState(null); // null = modal tertutup
    const [editingId, setEditingId] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        const [prodRes, catRes, groupRes] = await Promise.all([
            api.get('/admin/products'),
            api.get('/admin/categories'),
            api.get('/admin/modifier-groups'),
        ]);
        setProducts(prodRes.data.data || []);
        setCategories(catRes.data.data || []);
        setGroups(groupRes.data.data || []);
    }, []);

    useEffect(() => {
        fetchData().catch((err) => notify(apiErrorMessage(err, 'Gagal memuat katalog.'), 'error'));
    }, [fetchData, notify]);

    const replaceProduct = (product) => setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, ...product } : p)));

    const toggleAvailable = async (product) => {
        try {
            const res = await api.patch(`/admin/products/${product.id}/availability`, { is_available: !product.is_available });
            replaceProduct(res.data.data);
            notify(res.data.message);
        } catch (err) {
            notify(apiErrorMessage(err, 'Gagal mengubah ketersediaan.'), 'error');
        }
    };

    const toggleActive = async (product) => {
        try {
            const res = await api.put(`/admin/products/${product.id}`, { is_active: !product.is_active });
            replaceProduct(res.data.data);
            notify(product.is_active ? `${product.name} disembunyikan dari menu` : `${product.name} tampil di menu`);
        } catch (err) {
            notify(apiErrorMessage(err, 'Gagal mengubah status.'), 'error');
        }
    };

    const handleDelete = async (product) => {
        if (!window.confirm(`Hapus produk ${product.name}? Riwayat pesanan tetap tersimpan.`)) return;
        try {
            await api.delete(`/admin/products/${product.id}`);
            setProducts((prev) => prev.filter((p) => p.id !== product.id));
            notify('Produk dihapus');
        } catch (err) {
            notify(apiErrorMessage(err, 'Gagal menghapus produk.'), 'error');
        }
    };

    const openForm = (product = null) => {
        setFormError('');
        setEditingId(product?.id || null);
        setImagePreview(product?.image_url || null);
        setForm(product ? {
            ...emptyProduct(), ...product,
            sku: product.sku || '', description: product.description || '',
            modifier_group_ids: (product.modifier_groups || []).map((g) => g.id), image: null,
        } : emptyProduct(categories[0]?.id || ''));
    };

    const handleImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setForm((f) => ({ ...f, image: file }));
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const toggleGroup = (id) => setForm((f) => ({
        ...f,
        modifier_group_ids: f.modifier_group_ids.includes(id) ? f.modifier_group_ids.filter((g) => g !== id) : [...f.modifier_group_ids, id],
    }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError('');
        const data = new FormData();
        ['name', 'sku', 'category_id', 'price', 'station', 'stock_quantity', 'description', 'sort_order'].forEach((key) => {
            const value = form[key];
            if (value !== null && value !== undefined && value !== '') data.append(key, value);
        });
        BOOLEAN_FIELDS.forEach((key) => data.append(key, form[key] ? 1 : 0));
        if (form.modifier_group_ids.length === 0) data.append('modifier_group_ids', '');
        form.modifier_group_ids.forEach((id) => data.append('modifier_group_ids[]', id));
        if (form.image) data.append('image', form.image);

        try {
            const config = { headers: { 'Content-Type': 'multipart/form-data' } };
            if (editingId) {
                data.append('_method', 'PUT');
                await api.post(`/admin/products/${editingId}`, data, config);
            } else {
                await api.post('/admin/products', data, config);
            }
            notify(editingId ? 'Produk diperbarui' : 'Produk ditambahkan');
            setForm(null);
            await fetchData();
        } catch (err) {
            setFormError(apiErrorMessage(err, 'Gagal menyimpan produk. Periksa isian.'));
        } finally {
            setSaving(false);
        }
    };

    if (!products) return <LoadingBlock label="Memuat katalog..." />;

    const q = query.trim().toLowerCase();
    const visible = products
        .filter((p) => filterCategory === 'all' || String(p.category_id) === String(filterCategory))
        .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
    const soldOutCount = products.filter((p) => p.is_sold_out).length;

    return (
        <div className="animate-fade-in">
            <PageHeader eyebrow="Toko" title="Menu & Stok"
                description="Kelola produk, harga, stok, kategori, dan pilihan varian. Perubahan langsung berlaku di kasir dan menu online."
                actions={tab === 'products' && (
                    <button className="btn-primary" onClick={() => openForm()} disabled={categories.length === 0} title={categories.length === 0 ? 'Buat kategori dulu' : ''}>
                        <Icon name="add" className="text-[18px]" /> Tambah produk
                    </button>
                )} />

            <div className="flex gap-1.5 mb-8 border-b border-hairline">
                {[['products', 'Produk', products.length], ['categories', 'Kategori', categories.length], ['modifiers', 'Grup pilihan', groups.length]].map(([key, label, count]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-primary text-ink' : 'border-transparent text-on-surface-variant hover:text-ink'}`}>
                        {label} <span className="text-on-surface-variant tabular">{count}</span>
                    </button>
                ))}
            </div>

            {tab === 'categories' && <CategoryPanel categories={categories} onChange={fetchData} notify={notify} />}
            {tab === 'modifiers' && <ModifierGroupPanel groups={groups} onChange={fetchData} notify={notify} />}

            {tab === 'products' && (
                <>
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                            {[{ id: 'all', name: 'Semua' }, ...categories].map((c) => (
                                <button key={c.id} onClick={() => setFilterCategory(c.id)} className={String(filterCategory) === String(c.id) ? 'tab-active' : 'tab'}>{c.name}</button>
                            ))}
                        </div>
                        {soldOutCount > 0 && <span className="chip border-error/30 text-error bg-[#fff4f2]">{soldOutCount} habis</span>}
                        <div className="relative ml-auto w-full sm:w-64">
                            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
                            <input type="search" className="input pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari produk atau SKU" />
                        </div>
                    </div>

                    <div className="card overflow-hidden">
                        {visible.length === 0 ? (
                            <EmptyState icon="restaurant_menu" title="Belum ada produk" description="Tambahkan produk pertama Anda." />
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-hairline text-left">
                                        {['Produk', 'Harga', 'Stasiun', 'Stok', 'Ketersediaan', 'Tampil', ''].map((h) => (
                                            <th key={h} className="label-caps font-semibold px-5 py-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-hairline">
                                    {visible.map((p) => (
                                        <tr key={p.id} className={`hover:bg-surface-container-low/50 ${p.is_active ? '' : 'opacity-55'}`}>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-surface-container">
                                                        {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <Icon name="local_cafe" className="m-3 text-on-surface-variant/40" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-ink truncate">{p.name}{p.is_recommended && <Icon name="star" filled className="text-[14px] text-primary ml-1" />}</p>
                                                        <p className="text-xs text-on-surface-variant truncate">
                                                            {p.category?.name}{p.modifier_groups?.length > 0 && ` · ${p.modifier_groups.map((g) => g.name).join(', ')}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 tabular">{formatPrice(p.price)}</td>
                                            <td className="px-5 py-3.5 text-on-surface-variant">{p.station === 'kitchen' ? 'Dapur' : 'Bar'}</td>
                                            <td className="px-5 py-3.5 tabular">
                                                {p.track_stock
                                                    ? <span className={p.stock_quantity <= 0 ? 'text-error font-semibold' : p.stock_quantity <= 5 ? 'text-amber-700 font-semibold' : ''}>{p.stock_quantity}</span>
                                                    : <span className="text-on-surface-variant">—</span>}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <button onClick={() => toggleAvailable(p)} title="Klik untuk menandai tersedia/habis"
                                                    className={`chip ${p.is_sold_out ? 'border-error/30 text-error bg-[#fff4f2]' : 'border-sage/30 text-sage bg-sage-soft'}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${p.is_sold_out ? 'bg-error' : 'bg-sage'}`} />
                                                    {!p.is_available ? 'Habis (manual)' : p.is_sold_out ? 'Habis (stok 0)' : 'Tersedia'}
                                                </button>
                                            </td>
                                            <td className="px-5 py-3.5"><Switch checked={p.is_active} onChange={() => toggleActive(p)} label={`Tampilkan ${p.name}`} /></td>
                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                <button className="btn-icon btn-ghost" onClick={() => openForm(p)} aria-label="Ubah"><Icon name="edit" className="text-[18px]" /></button>
                                                <button className="btn-icon btn-ghost hover:text-error" onClick={() => handleDelete(p)} aria-label="Hapus"><Icon name="delete" className="text-[18px]" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {form && (
                <Modal title={editingId ? 'Ubah produk' : 'Tambah produk'} onClose={() => setForm(null)} size="xl"
                    footer={<><button className="btn-outline" onClick={() => setForm(null)}>Batal</button><button form="product-form" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan produk'}</button></>}>
                    <form id="product-form" onSubmit={handleSubmit} className="grid md:grid-cols-[240px_1fr] gap-8">
                        <div className="space-y-4">
                            <label className="block aspect-square rounded-xl overflow-hidden bg-surface-container border border-dashed border-hairline cursor-pointer hover:border-ink/40 relative group">
                                {imagePreview
                                    ? <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                                    : <span className="absolute inset-0 flex flex-col items-center justify-center text-on-surface-variant text-sm gap-2"><Icon name="add_photo_alternate" className="text-4xl" /> Unggah foto</span>}
                                {imagePreview && <span className="absolute inset-x-0 bottom-0 bg-espresso/60 text-cream text-xs py-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">Ganti foto</span>}
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} className="sr-only" />
                            </label>
                            <p className="text-xs text-on-surface-variant">JPG, PNG, atau WEBP, maks. 2 MB.</p>
                            <div className="space-y-3 pt-2">
                                {[['is_active', 'Tampil di menu'], ['is_available', 'Tersedia untuk dipesan'], ['is_recommended', 'Rekomendasi di beranda']].map(([key, label]) => (
                                    <div key={key} className="flex items-center justify-between gap-3 text-sm">
                                        <span>{label}</span>
                                        <Switch checked={!!form[key]} onChange={() => setForm({ ...form, [key]: !form[key] })} label={label} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <Field label="Nama produk" className="col-span-2"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                            <Field label="Kategori">
                                <select className="input" required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Harga (belum pajak)"><input className="input tabular" type="number" min="0" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
                            <Field label="Dibuat di">
                                <select className="input" value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })}>
                                    <option value="bar">Bar (minuman)</option>
                                    <option value="kitchen">Dapur (makanan)</option>
                                </select>
                            </Field>
                            <Field label="SKU (opsional)"><input className="input" maxLength={50} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>

                            <div className="col-span-2 rounded-xl border border-hairline p-4 flex flex-wrap items-center gap-5">
                                <div className="flex items-center gap-3 text-sm flex-1 min-w-[220px]">
                                    <Switch checked={form.track_stock} onChange={() => setForm({ ...form, track_stock: !form.track_stock })} label="Hitung stok" />
                                    <span>Hitung stok <span className="block text-xs text-on-surface-variant">Otomatis habis saat stok 0</span></span>
                                </div>
                                {form.track_stock && (
                                    <label className="flex items-center gap-3 text-sm">Stok
                                        <input className="input w-28 tabular" type="number" min="0" required value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
                                    </label>
                                )}
                            </div>

                            <Field label="Deskripsi" className="col-span-2">
                                <textarea className="input resize-none" rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </Field>
                            <div className="col-span-2">
                                <p className="label-caps mb-2">Grup pilihan</p>
                                {groups.length === 0 ? <p className="text-sm text-on-surface-variant">Belum ada grup. Buat di tab Grup pilihan.</p> : (
                                    <div className="flex flex-wrap gap-2">
                                        {groups.map((g) => {
                                            const on = form.modifier_group_ids.includes(g.id);
                                            return (
                                                <button type="button" key={g.id} onClick={() => toggleGroup(g.id)}
                                                    className={`chip py-1.5 px-3 text-xs ${on ? 'bg-ink text-cream border-ink' : 'border-hairline text-on-surface-variant hover:border-ink/40'}`}>
                                                    {on && <Icon name="check" className="text-[14px]" />}{g.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <Field label="Urutan tampil" hint="Angka kecil tampil lebih dulu."><input className="input w-32" type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></Field>
                            {formError && <p className="col-span-2 text-sm text-error" role="alert">{formError}</p>}
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default CatalogManagement;
