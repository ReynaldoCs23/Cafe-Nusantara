import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { EmptyState, Field, Icon, Modal, Spinner } from '../../../components/ui';
import { apiErrorMessage } from '../../../utils/pos';

/** Cari member lewat no. HP/nama atau daftarkan member baru (nama + no. HP). */
const MemberModal = ({ onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [mode, setMode] = useState('search');
    const [form, setForm] = useState({ name: '', phone_number: '' });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return undefined;
        }
        setSearching(true);
        const timer = setTimeout(() => {
            api.get('/admin/pos/members', { params: { q: query.trim() } })
                .then((res) => setResults(res.data.data))
                .catch(() => setResults([]))
                .finally(() => setSearching(false));
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const register = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await api.post('/admin/pos/members', form);
            onSelect(res.data.data);
        } catch (err) {
            setError(apiErrorMessage(err, 'Gagal mendaftarkan member.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={mode === 'search' ? 'Pilih member' : 'Daftar member baru'} subtitle="Member mengumpulkan poin dari setiap transaksi." onClose={onClose} size="md">
            {mode === 'search' ? (
                <div className="space-y-4">
                    <div className="relative">
                        <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                        <input className="input-lg pl-11" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="No. HP atau nama" autoFocus inputMode="search" />
                    </div>
                    <div className="min-h-[160px]">
                        {searching ? <div className="py-10 flex justify-center text-on-surface-variant"><Spinner /></div>
                            : results.length > 0 ? (
                                <ul className="divide-y divide-hairline border-y border-hairline">
                                    {results.map((m) => (
                                        <li key={m.id}>
                                            <button onClick={() => onSelect(m)} className="w-full flex items-center justify-between gap-4 py-3 px-1 text-left hover:bg-surface-container-low">
                                                <span>
                                                    <span className="block font-medium">{m.name}</span>
                                                    <span className="block text-sm text-on-surface-variant tabular">{m.phone_number || '—'}</span>
                                                </span>
                                                <span className="chip border-sage/30 text-sage bg-sage-soft tabular">{m.loyalty_points} poin</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : query.trim().length >= 2 ? (
                                <EmptyState icon="person_search" title="Member tidak ditemukan" />
                            ) : <p className="text-sm text-on-surface-variant py-6 text-center">Ketik minimal 2 karakter.</p>}
                    </div>
                    <button className="btn-outline w-full" onClick={() => { setMode('register'); setForm({ name: '', phone_number: /^\d+$/.test(query.trim()) ? query.trim() : '' }); }}>
                        <Icon name="person_add" className="text-[18px]" /> Daftarkan member baru
                    </button>
                </div>
            ) : (
                <form onSubmit={register} className="space-y-4">
                    <Field label="Nama"><input className="input-lg" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
                    <Field label="No. HP" hint="Dipakai untuk mencari member di transaksi berikutnya."><input className="input-lg tabular" required inputMode="tel" maxLength={20} value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></Field>
                    {error && <p className="text-sm text-error" role="alert">{error}</p>}
                    <div className="flex justify-between gap-3 pt-2">
                        <button type="button" className="btn-ghost" onClick={() => setMode('search')}><Icon name="arrow_back" className="text-[18px]" /> Cari</button>
                        <button className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Daftar & pilih'}</button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default MemberModal;
