import { useEffect, useMemo, useState } from 'react';
import { Icon } from './ui';
import { formatPrice } from '../utils/pos';

const defaultSelection = (product) => {
    const selection = {};
    (product?.modifier_groups || []).forEach((group) => {
        const available = (group.modifiers || []).filter((m) => m.is_available);
        selection[group.id] = group.min_select > 0 && group.max_select === 1 && available[0] ? [available[0].id] : [];
    });
    return selection;
};

/**
 * Detail produk untuk pelanggan: pilihan varian dari backend, jumlah, dan catatan.
 * Grup wajib harus dipilih sebelum bisa ditambahkan ke keranjang.
 */
const ProductModal = ({ product, isOpen, onClose, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const [selection, setSelection] = useState({});
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen && product) {
            setQuantity(1);
            setSelection(defaultSelection(product));
            setNotes('');
        }
    }, [isOpen, product]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [isOpen, onClose]);

    const groups = useMemo(() => product?.modifier_groups || [], [product]);
    const chosen = useMemo(() => {
        const out = [];
        groups.forEach((g) => (selection[g.id] || []).forEach((id) => {
            const m = g.modifiers.find((x) => x.id === id);
            if (m) out.push({ id: m.id, group: g.name, name: m.name, price_delta: m.price_delta });
        }));
        return out;
    }, [groups, selection]);

    if (!isOpen || !product) return null;

    const missing = groups.filter((g) => (selection[g.id] || []).length < g.min_select);
    const unitPrice = product.price + chosen.reduce((s, m) => s + m.price_delta, 0);
    const soldOut = product.is_sold_out;

    const toggle = (group, id) => setSelection((prev) => {
        const current = prev[group.id] || [];
        if (group.max_select === 1) return { ...prev, [group.id]: current.includes(id) && group.min_select === 0 ? [] : [id] };
        if (current.includes(id)) return { ...prev, [group.id]: current.filter((x) => x !== id) };
        if (group.max_select > 0 && current.length >= group.max_select) return prev;
        return { ...prev, [group.id]: [...current, id] };
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-espresso/50 backdrop-blur-[2px] md:p-6" role="dialog" aria-modal="true" aria-label={product.name}>
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative w-full max-w-5xl max-h-[94vh] overflow-hidden bg-cream rounded-t-3xl md:rounded-3xl grid md:grid-cols-2 animate-slide-up">
                <button onClick={onClose} className="absolute right-4 top-4 z-10 h-10 w-10 rounded-full bg-cream/90 flex items-center justify-center hover:bg-paper" aria-label="Tutup">
                    <Icon name="close" />
                </button>

                <div className="relative h-64 md:h-auto bg-surface-container">
                    {product.image_url
                        ? <img src={product.image_url} alt={product.name} className={`absolute inset-0 h-full w-full object-cover ${soldOut ? 'grayscale opacity-60' : ''}`} />
                        : <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant/30"><Icon name="local_cafe" className="text-7xl" /></div>}
                </div>

                <div className="flex flex-col max-h-[calc(94vh-16rem)] md:max-h-[90vh]">
                    <div className="flex-1 overflow-y-auto scroll-thin px-6 md:px-10 pt-8 pb-6">
                        {product.category && <p className="label-caps text-primary mb-3">{product.category.name}</p>}
                        <h2 className="font-display text-4xl leading-tight text-ink">{product.name}</h2>
                        <p className="mt-3 text-xl text-primary tabular">{formatPrice(unitPrice)}</p>
                        {product.description && <p className="mt-5 text-on-surface-variant leading-relaxed">{product.description}</p>}

                        <div className="mt-8 space-y-7">
                            {groups.map((group) => (
                                <fieldset key={group.id}>
                                    <legend className="flex items-baseline justify-between w-full mb-3">
                                        <span className="label-caps text-ink">{group.name}</span>
                                        <span className={`text-xs ${missing.includes(group) ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
                                            {group.min_select > 0 ? 'Wajib' : 'Opsional'}{group.max_select > 1 ? ` · maks ${group.max_select}` : ''}
                                        </span>
                                    </legend>
                                    <div className="flex flex-wrap gap-2">
                                        {group.modifiers.map((m) => {
                                            const active = (selection[group.id] || []).includes(m.id);
                                            return (
                                                <button type="button" key={m.id} disabled={!m.is_available} onClick={() => toggle(group, m.id)} aria-pressed={active}
                                                    className={`rounded-full border px-4 py-2 text-sm transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
                                                        active ? 'border-ink bg-ink text-cream' : 'border-hairline bg-paper hover:border-ink/40'
                                                    }`}>
                                                    {m.name}
                                                    {m.price_delta !== 0 && <span className={`ml-1.5 text-xs ${active ? 'text-stone-300' : 'text-on-surface-variant'}`}>+{formatPrice(m.price_delta)}</span>}
                                                    {!m.is_available && <span className="ml-1.5 text-xs">· habis</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            ))}

                            <label className="block">
                                <span className="label-caps text-ink block mb-3">Catatan <span className="normal-case tracking-normal font-normal text-on-surface-variant">(opsional)</span></span>
                                <input className="input" maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: tanpa sedotan" />
                            </label>
                        </div>
                    </div>

                    <div className="border-t border-hairline px-6 md:px-10 py-5 bg-cream">
                        {missing.length > 0 && !soldOut && <p className="text-sm text-primary mb-3">Pilih {missing.map((g) => g.name).join(', ')} terlebih dahulu.</p>}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center rounded-full border border-hairline bg-paper">
                                <button className="h-12 w-12 flex items-center justify-center text-on-surface-variant hover:text-ink" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Kurangi"><Icon name="remove" /></button>
                                <span className="w-8 text-center font-semibold tabular">{quantity}</span>
                                <button className="h-12 w-12 flex items-center justify-center text-on-surface-variant hover:text-ink" onClick={() => setQuantity((q) => Math.min(99, q + 1))} aria-label="Tambah"><Icon name="add" /></button>
                            </div>
                            <button className="btn-primary btn-lg flex-1 rounded-full" disabled={soldOut || missing.length > 0}
                                onClick={() => onAddToCart(product, quantity, chosen, notes)}>
                                {soldOut ? 'Sedang habis' : <>Tambah ke keranjang · <span className="tabular">{formatPrice(unitPrice * quantity)}</span></>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductModal;
