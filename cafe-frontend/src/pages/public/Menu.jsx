import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useCart } from '../../context/CartContext';
import ProductModal from '../../components/ProductModal';
import ProductCard from '../../components/ProductCard';
import PageIntro from '../../components/public/PageIntro';
import { EmptyState, Icon, Spinner } from '../../components/ui';
import { formatPrice } from '../../utils/pos';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import { useTableSession } from '../../hooks/useTableSession';

const SORTS = [
    ['recommended', 'Rekomendasi'],
    ['price-asc', 'Harga terendah'],
    ['price-desc', 'Harga tertinggi'],
];

/** Menu publik: kategori, pencarian, urutan, dan bilah keranjang melayang. */
const Menu = () => {
    const { addToCart, itemCount, subtotal } = useCart();
    const settings = useStoreSettings();
    const table = useTableSession();
    const [products, setProducts] = useState(null);
    const [categories, setCategories] = useState([]);
    const [category, setCategory] = useState('all');
    const [sort, setSort] = useState('recommended');
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        Promise.all([api.get('/products'), api.get('/categories')])
            .then(([p, c]) => {
                setProducts(p.data.data);
                setCategories(c.data.data);
            })
            .catch(() => setProducts([]));
    }, []);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = (products || [])
            .filter((p) => category === 'all' || p.category_id === category)
            .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
        const byAvailability = (a, b) => Number(a.is_sold_out) - Number(b.is_sold_out);
        if (sort === 'price-asc') return [...list].sort((a, b) => byAvailability(a, b) || a.price - b.price);
        if (sort === 'price-desc') return [...list].sort((a, b) => byAvailability(a, b) || b.price - a.price);
        return [...list].sort((a, b) => byAvailability(a, b) || Number(b.is_recommended) - Number(a.is_recommended));
    }, [products, category, sort, query]);

    return (
        <div className="animate-fade-in pb-32">
            <PageIntro eyebrow={table ? `Menu · ${table.name}` : 'Menu'} title={table ? 'Mau pesan apa hari ini?' : 'Diseduh dengan sepenuh hati.'}
                description={table
                    ? 'Pilih menu, kirim pesanan, lalu bayar di kasir. Pesanan akan diantar ke meja Anda.'
                    : 'Biji kopi pilihan dari berbagai penjuru nusantara, minuman khas, dan teman ngopi yang dibuat setiap hari.'} />

            {settings && !settings.is_open && (
                <div className="max-w-7xl mx-auto px-5 md:px-10 mb-8">
                    <p className="flex items-center gap-3 rounded-2xl bg-amber-soft border border-amber-200 px-5 py-4 text-sm text-amber-900">
                        <Icon name="schedule" /> Kami sedang tutup. Anda tetap bisa melihat menu; pemesanan dibuka kembali saat jam buka.
                    </p>
                </div>
            )}

            {/* Navigasi kategori menempel */}
            <div className={`sticky z-30 bg-cream/95 backdrop-blur border-y border-hairline ${table ? 'top-[124px]' : 'top-20'}`}>
                <div className="max-w-7xl mx-auto px-5 md:px-10 py-3 flex flex-wrap items-center gap-3">
                    <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-1 px-1">
                        <button className={category === 'all' ? 'tab-active' : 'tab'} onClick={() => setCategory('all')}>Semua</button>
                        {categories.map((c) => (
                            <button key={c.id} className={category === c.id ? 'tab-active' : 'tab'} onClick={() => setCategory(c.id)}>{c.name}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-56">
                            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
                            <input type="search" className="input pl-10 py-2 rounded-full" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari menu" aria-label="Cari menu" />
                        </div>
                        <select className="input py-2 w-auto rounded-full" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Urutkan">
                            {SORTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-5 md:px-10 pt-12">
                {!products ? (
                    <div className="py-24 flex justify-center text-on-surface-variant"><Spinner /></div>
                ) : visible.length === 0 ? (
                    <EmptyState icon="search_off" title="Menu tidak ditemukan" description="Coba kategori atau kata kunci lain." />
                ) : (
                    <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                        {visible.map((product) => <ProductCard key={product.id} product={product} onClick={setSelected} onAddToCart={addToCart} />)}
                    </div>
                )}
            </div>

            <ProductModal product={selected} isOpen={!!selected} onClose={() => setSelected(null)}
                onAddToCart={(product, qty, modifiers, notes) => { addToCart(product, qty, modifiers, notes); setSelected(null); }} />

            {itemCount > 0 && !selected && (
                <div className="fixed bottom-5 inset-x-5 md:inset-x-auto md:right-10 md:w-[420px] z-40 animate-slide-up">
                    <Link to="/cart" className="flex items-center justify-between gap-4 rounded-full bg-ink text-cream pl-6 pr-2 py-2 hover:bg-espresso-2 transition-colors">
                        <span className="text-sm"><span className="font-semibold tabular">{itemCount} item</span> · <span className="tabular">{formatPrice(subtotal)}</span></span>
                        <span className="flex items-center gap-2 rounded-full bg-primary text-white px-5 py-2.5 text-sm font-semibold">Lihat keranjang <Icon name="arrow_forward" className="text-[18px]" /></span>
                    </Link>
                </div>
            )}
        </div>
    );
};

export default Menu;
