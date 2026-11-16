import { useMemo, useState } from 'react';
import { Icon, Modal } from '../../../components/ui';
import { formatPrice } from '../../../utils/pos';

const initialSelection = (product) => {
    const selection = {};
    (product.modifier_groups || []).forEach((group) => {
        const available = (group.modifiers || []).filter((m) => m.is_available);
        selection[group.id] = group.min_select > 0 && group.max_select === 1 && available[0] ? [available[0].id] : [];
    });
    return selection;
};

/** Pilih varian/modifier di kasir, dioptimalkan untuk layar sentuh. */
const ModifierSheet = ({ product, onAdd, onClose }) => {
    const [selection, setSelection] = useState(() => initialSelection(product));
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const groups = useMemo(() => product.modifier_groups || [], [product]);

    const chosen = useMemo(() => {
        const out = [];
        groups.forEach((g) => (selection[g.id] || []).forEach((id) => {
            const m = g.modifiers.find((x) => x.id === id);
            if (m) out.push({ id: m.id, group: g.name, name: m.name, price_delta: m.price_delta });
        }));
        return out;
    }, [groups, selection]);

    const missing = groups.filter((g) => (selection[g.id] || []).length < g.min_select);
    const unit = product.price + chosen.reduce((s, m) => s + m.price_delta, 0);

    const toggle = (group, id) => setSelection((prev) => {
        const current = prev[group.id] || [];
        if (group.max_select === 1) {
            return { ...prev, [group.id]: current.includes(id) && group.min_select === 0 ? [] : [id] };
        }
        if (current.includes(id)) return { ...prev, [group.id]: current.filter((x) => x !== id) };
        if (group.max_select > 0 && current.length >= group.max_select) return prev;
        return { ...prev, [group.id]: [...current, id] };
    });

    return (
        <Modal title={product.name} subtitle={formatPrice(product.price)} onClose={onClose} size="lg"
            footer={
                <>
                    <div className="mr-auto flex items-center rounded-xl border border-hairline bg-paper">
                        <button className="btn-icon btn-ghost" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Kurangi"><Icon name="remove" /></button>
                        <span className="w-10 text-center font-semibold tabular">{quantity}</span>
                        <button className="btn-icon btn-ghost" onClick={() => setQuantity((q) => Math.min(999, q + 1))} aria-label="Tambah"><Icon name="add" /></button>
                    </div>
                    <button className="btn-primary btn-lg min-w-[220px]" disabled={missing.length > 0}
                        onClick={() => onAdd(product, quantity, chosen, notes.trim())}>
                        Tambah · {formatPrice(unit * quantity)}
                    </button>
                </>
            }
        >
            <div className="space-y-6">
                {groups.map((group) => (
                    <div key={group.id}>
                        <div className="flex items-baseline justify-between mb-2.5">
                            <p className="font-semibold">{group.name}</p>
                            <span className={`text-xs ${missing.includes(group) ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
                                {group.min_select > 0 ? 'Wajib' : 'Opsional'}{group.max_select > 1 ? ` · maks ${group.max_select}` : ''}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {group.modifiers.map((m) => {
                                const active = (selection[group.id] || []).includes(m.id);
                                return (
                                    <button key={m.id} type="button" disabled={!m.is_available} onClick={() => toggle(group, m.id)}
                                        className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors disabled:opacity-40 ${
                                            active ? 'border-ink bg-ink text-cream' : 'border-hairline bg-paper hover:border-ink/40'
                                        }`}>
                                        <span className="block font-medium">{m.name}</span>
                                        <span className={`block text-xs ${active ? 'text-stone-300' : 'text-on-surface-variant'}`}>
                                            {!m.is_available ? 'Habis' : m.price_delta ? `+${formatPrice(m.price_delta)}` : 'Tanpa biaya'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
                <label className="block">
                    <span className="label-caps block mb-1.5">Catatan item</span>
                    <input className="input" value={notes} maxLength={200} onChange={(e) => setNotes(e.target.value)} placeholder="Mis. extra panas, tanpa sedotan" />
                </label>
            </div>
        </Modal>
    );
};

export default ModifierSheet;
