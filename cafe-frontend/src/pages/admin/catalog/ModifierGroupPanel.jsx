import { useState } from 'react';
import api from '../../../api/axios';
import { EmptyState, Field, Icon, Modal } from '../../../components/ui';
import { apiErrorMessage, formatPrice } from '../../../utils/pos';

const blankGroup = () => ({ name: '', min_select: 1, max_select: 1, modifiers: [{ name: '', price_delta: 0, is_available: true }] });

const describeRule = (g) => {
    if (g.min_select === 0) return g.max_select === 1 ? 'Opsional · pilih 1' : `Opsional · maks ${g.max_select || '∞'}`;
    if (g.max_select === 1) return 'Wajib · pilih 1';
    return `Wajib · min ${g.min_select}${g.max_select ? `, maks ${g.max_select}` : ''}`;
};

/** Grup pilihan (Ukuran, Gula, Es, Topping) yang bisa dipasang ke banyak produk. */
const ModifierGroupPanel = ({ groups, onChange, notify }) => {
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const open = (group = null) => {
        setError('');
        setForm(group
            ? { id: group.id, name: group.name, min_select: group.min_select, max_select: group.max_select, modifiers: group.modifiers.map((m) => ({ ...m })) }
            : blankGroup());
    };

    const updateModifier = (index, patch) =>
        setForm((f) => ({ ...f, modifiers: f.modifiers.map((m, i) => (i === index ? { ...m, ...patch } : m)) }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        const payload = {
            name: form.name.trim(),
            min_select: Number(form.min_select) || 0,
            max_select: Number(form.max_select) || 0,
            modifiers: form.modifiers.map((m) => ({ id: m.id, name: m.name.trim(), price_delta: Number(m.price_delta) || 0, is_available: m.is_available !== false })),
        };
        try {
            if (form.id) await api.put(`/admin/modifier-groups/${form.id}`, payload);
            else await api.post('/admin/modifier-groups', payload);
            notify('Grup pilihan disimpan');
            setForm(null);
            await onChange();
        } catch (err) {
            setError(apiErrorMessage(err, 'Gagal menyimpan grup pilihan.'));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (group) => {
        if (!window.confirm(`Hapus grup ${group.name}? Grup akan dilepas dari ${group.products_count ?? 0} produk.`)) return;
        try {
            await api.delete(`/admin/modifier-groups/${group.id}`);
            notify('Grup pilihan dihapus');
            await onChange();
        } catch (err) {
            notify(apiErrorMessage(err, 'Gagal menghapus grup.'), 'error');
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <p className="text-sm text-on-surface-variant max-w-xl">Pasang grup ke produk lewat form produk. Harga tambahan dihitung otomatis di kasir dan menu online.</p>
                <button className="btn-primary" onClick={() => open()}><Icon name="add" className="text-[18px]" /> Grup baru</button>
            </div>

            {groups.length === 0 ? (
                <div className="card"><EmptyState icon="tune" title="Belum ada grup pilihan" /></div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {groups.map((g) => (
                        <div key={g.id} className="card p-6">
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div>
                                    <p className="font-display text-xl">{g.name}</p>
                                    <p className="text-xs text-on-surface-variant mt-0.5">{describeRule(g)} · {g.products_count ?? 0} produk</p>
                                </div>
                                <div className="flex -mr-2 -mt-1">
                                    <button className="btn-icon btn-ghost" onClick={() => open(g)} aria-label="Ubah"><Icon name="edit" className="text-[18px]" /></button>
                                    <button className="btn-icon btn-ghost hover:text-error" onClick={() => remove(g)} aria-label="Hapus"><Icon name="delete" className="text-[18px]" /></button>
                                </div>
                            </div>
                            <ul className="divide-y divide-hairline text-sm">
                                {g.modifiers.map((m) => (
                                    <li key={m.id} className={`flex justify-between py-2 ${m.is_available ? '' : 'text-on-surface-variant line-through'}`}>
                                        <span>{m.name}</span>
                                        <span className="tabular text-on-surface-variant">{m.price_delta ? `+${formatPrice(m.price_delta)}` : '—'}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            {form && (
                <Modal title={form.id ? 'Ubah grup pilihan' : 'Grup pilihan baru'} onClose={() => setForm(null)} size="lg"
                    footer={<><button className="btn-outline" onClick={() => setForm(null)}>Batal</button><button form="modifier-form" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button></>}>
                    <form id="modifier-form" onSubmit={submit} className="space-y-5">
                        <Field label="Nama grup"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mis. Ukuran, Gula, Topping" autoFocus /></Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Minimal dipilih" hint="0 = opsional"><input className="input" type="number" min="0" max="20" value={form.min_select} onChange={(e) => setForm({ ...form, min_select: e.target.value })} /></Field>
                            <Field label="Maksimal dipilih" hint="0 = tanpa batas"><input className="input" type="number" min="0" max="20" value={form.max_select} onChange={(e) => setForm({ ...form, max_select: e.target.value })} /></Field>
                        </div>
                        <div>
                            <div className="grid grid-cols-[1fr_120px_56px_32px] gap-2 mb-2 label-caps">
                                <span>Pilihan</span><span>+ Harga</span><span>Ada</span><span />
                            </div>
                            <div className="space-y-2">
                                {form.modifiers.map((m, index) => (
                                    <div key={m.id ?? `new-${index}`} className="grid grid-cols-[1fr_120px_56px_32px] gap-2 items-center">
                                        <input className="input" required value={m.name} onChange={(e) => updateModifier(index, { name: e.target.value })} placeholder="Mis. Large" />
                                        <input className="input tabular" type="number" step="500" value={m.price_delta} onChange={(e) => updateModifier(index, { price_delta: e.target.value })} />
                                        <input type="checkbox" className="justify-self-center h-4 w-4" checked={m.is_available !== false} onChange={(e) => updateModifier(index, { is_available: e.target.checked })} aria-label="Tersedia" />
                                        <button type="button" className="btn-icon btn-ghost hover:text-error" disabled={form.modifiers.length === 1}
                                            onClick={() => setForm((f) => ({ ...f, modifiers: f.modifiers.filter((_, i) => i !== index) }))} aria-label="Hapus pilihan">
                                            <Icon name="close" className="text-[18px]" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" className="btn-ghost mt-2 -ml-4" onClick={() => setForm((f) => ({ ...f, modifiers: [...f.modifiers, { name: '', price_delta: 0, is_available: true }] }))}>
                                <Icon name="add" className="text-[18px]" /> Tambah pilihan
                            </button>
                        </div>
                        {error && <p className="text-sm text-error" role="alert">{error}</p>}
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default ModifierGroupPanel;
