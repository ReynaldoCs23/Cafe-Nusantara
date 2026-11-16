import { useState } from 'react';
import api from '../../../api/axios';
import { EmptyState, Icon } from '../../../components/ui';
import { apiErrorMessage } from '../../../utils/pos';

/** Kategori menu: tambah, ubah nama/urutan, sembunyikan, hapus. */
const CategoryPanel = ({ categories, onChange, notify }) => {
    const [name, setName] = useState('');
    const [editing, setEditing] = useState(null);
    const [busy, setBusy] = useState(false);

    const run = async (fn, message) => {
        setBusy(true);
        try {
            await fn();
            notify(message);
            await onChange();
        } catch (err) {
            notify(apiErrorMessage(err, 'Gagal menyimpan kategori.'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const create = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        run(async () => {
            await api.post('/admin/categories', { name: name.trim(), sort_order: categories.length });
            setName('');
        }, 'Kategori ditambahkan');
    };

    const save = (e) => {
        e.preventDefault();
        run(async () => {
            await api.put(`/admin/categories/${editing.id}`, { name: editing.name.trim(), sort_order: Number(editing.sort_order) || 0 });
            setEditing(null);
        }, 'Kategori diperbarui');
    };

    return (
        <div className="max-w-3xl">
            <form onSubmit={create} className="flex gap-3 mb-6">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kategori baru, mis. Pastry" maxLength={255} />
                <button className="btn-primary shrink-0" disabled={busy || !name.trim()}><Icon name="add" className="text-[18px]" /> Tambah</button>
            </form>

            <div className="card divide-y divide-hairline">
                {categories.length === 0 && <EmptyState icon="category" title="Belum ada kategori" />}
                {categories.map((c) => (
                    <div key={c.id} className="px-5 py-4 flex items-center gap-4">
                        {editing?.id === c.id ? (
                            <form onSubmit={save} className="flex flex-1 items-center gap-3">
                                <input className="input" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
                                <input className="input w-24 tabular" type="number" min="0" title="Urutan" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} />
                                <button className="btn-primary" disabled={busy}>Simpan</button>
                                <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Batal</button>
                            </form>
                        ) : (
                            <>
                                <span className="w-8 text-center text-xs text-on-surface-variant tabular">{c.sort_order}</span>
                                <div className="flex-1">
                                    <p className={`font-medium ${c.is_active ? '' : 'text-on-surface-variant line-through'}`}>{c.name}</p>
                                    <p className="text-xs text-on-surface-variant">{c.products_count ?? 0} produk</p>
                                </div>
                                <button disabled={busy} onClick={() => run(() => api.put(`/admin/categories/${c.id}`, { is_active: !c.is_active }), c.is_active ? `${c.name} disembunyikan` : `${c.name} ditampilkan`)}
                                    className={`chip ${c.is_active ? 'border-sage/30 text-sage bg-sage-soft' : 'border-hairline text-on-surface-variant'}`}>
                                    {c.is_active ? 'Tampil' : 'Disembunyikan'}
                                </button>
                                <button className="btn-icon btn-ghost" onClick={() => setEditing({ id: c.id, name: c.name, sort_order: c.sort_order })} aria-label="Ubah"><Icon name="edit" className="text-[18px]" /></button>
                                <button className="btn-icon btn-ghost hover:text-error" disabled={busy} aria-label="Hapus"
                                    onClick={() => window.confirm(`Hapus kategori ${c.name}?`) && run(() => api.delete(`/admin/categories/${c.id}`), 'Kategori dihapus')}>
                                    <Icon name="delete" className="text-[18px]" />
                                </button>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryPanel;
