import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, Field, Icon, LoadingBlock, Modal, PageHeader, useToast } from '../../components/ui';
import { ROLES, STAFF_ROLES, apiErrorMessage } from '../../utils/pos';

const emptyForm = { name: '', username: '', email: '', phone_number: '', password: '', role: 'cashier', pin: '', remove_pin: false, is_active: true };

const ROLE_TONE = {
    owner: 'bg-primary/10 text-primary border-primary/25',
    manager: 'bg-amber-soft text-amber-800 border-amber-200',
    cashier: 'bg-sage-soft text-sage border-sage/25',
    barista: 'bg-surface-container text-ink border-hairline',
    waiter: 'bg-surface-container text-ink border-hairline',
    customer: 'bg-paper text-on-surface-variant border-hairline',
};

/** Staf (peran, PIN, status aktif) dan akun pelanggan. Khusus owner. */
const UserManagement = () => {
    const { user: me } = useAuth();
    const { notify } = useToast();
    const [users, setUsers] = useState(null);
    const [tab, setTab] = useState('staff');
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [pointsUser, setPointsUser] = useState(null);

    useEffect(() => {
        api.get('/admin/users')
            .then((res) => setUsers(res.data.data))
            .catch((err) => notify(apiErrorMessage(err, 'Gagal memuat pengguna.'), 'error'));
    }, [notify]);

    const openForm = (user = null) => {
        setEditing(user);
        setError('');
        setForm(user
            ? { ...emptyForm, name: user.name, username: user.username || '', email: user.email, phone_number: user.phone_number || '', role: user.role, is_active: user.is_active !== false }
            : { ...emptyForm, role: tab === 'customer' ? 'customer' : 'cashier' });
    };

    const remove = async (user) => {
        if (!window.confirm(`Hapus ${user.name}? Akun ini akan keluar dari semua perangkat.`)) return;
        try {
            await api.delete(`/admin/users/${user.id}`);
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            notify('Pengguna dihapus');
        } catch (err) {
            notify(apiErrorMessage(err, 'Gagal menghapus pengguna.'), 'error');
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        if (!payload.pin) delete payload.pin;
        if (!payload.username) delete payload.username;
        if (!payload.phone_number) payload.phone_number = null;
        try {
            if (editing) {
                const res = await api.put(`/admin/users/${editing.id}`, payload);
                setUsers((prev) => prev.map((u) => (u.id === editing.id ? res.data.data : u)));
                notify('Pengguna diperbarui');
            } else {
                const res = await api.post('/admin/users', payload);
                setUsers((prev) => [...prev, res.data.data]);
                notify(`Pengguna dibuat · username ${res.data.data.username}`);
            }
            setForm(null);
        } catch (err) {
            setError(apiErrorMessage(err, 'Gagal menyimpan pengguna.'));
        } finally {
            setSaving(false);
        }
    };

    if (!users) return <LoadingBlock />;

    const q = query.trim().toLowerCase();
    const staff = users.filter((u) => STAFF_ROLES.includes(u.role));
    const visible = (tab === 'staff' ? staff : users.filter((u) => u.role === 'customer'))
        .filter((u) => !q || [u.name, u.username, u.email].some((v) => (v || '').toLowerCase().includes(q)));
    const isStaffForm = form && STAFF_ROLES.includes(form.role);
    const withoutPin = staff.filter((u) => !u.has_pin && u.is_active !== false).length;

    return (
        <div className="animate-fade-in">
            <PageHeader eyebrow="Toko" title="Pengguna" description="Atur siapa boleh mengakses apa. PIN dipakai untuk ganti pengguna cepat dan persetujuan manager."
                actions={<button className="btn-primary" onClick={() => openForm()}><Icon name="person_add" className="text-[18px]" /> Tambah pengguna</button>} />

            {withoutPin > 0 && tab === 'staff' && (
                <p className="mb-6 flex items-center gap-3 rounded-xl bg-amber-soft border border-amber-200 px-5 py-3 text-sm text-amber-900">
                    <Icon name="key" className="text-[20px]" /> {withoutPin} staf aktif belum punya PIN.
                </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-5">
                <div className="flex gap-1.5">
                    <button className={tab === 'staff' ? 'tab-active' : 'tab'} onClick={() => setTab('staff')}>Staf <span className="opacity-60 tabular">{staff.length}</span></button>
                    <button className={tab === 'customer' ? 'tab-active' : 'tab'} onClick={() => setTab('customer')}>Pelanggan <span className="opacity-60 tabular">{users.length - staff.length}</span></button>
                </div>
                <div className="relative ml-auto w-full sm:w-64">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
                    <input type="search" className="input pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama, username, email" />
                </div>
            </div>

            <div className="card overflow-hidden">
                {visible.length === 0 ? <EmptyState icon="group" title="Belum ada pengguna" /> : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-hairline text-left">
                                {['Nama', 'Username', 'Peran', tab === 'staff' ? 'PIN' : 'No. HP', 'Status', ''].map((h) => <th key={h} className="label-caps font-semibold px-5 py-4">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {visible.map((u) => (
                                <tr key={u.id} className={`hover:bg-surface-container-low/50 ${u.is_active === false ? 'opacity-55' : ''}`}>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <span className="h-9 w-9 shrink-0 rounded-full bg-surface-container text-ink font-semibold flex items-center justify-center">{u.name.slice(0, 1).toUpperCase()}</span>
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{u.name}{u.id === me?.id && <span className="ml-2 text-xs text-on-surface-variant">(Anda)</span>}</p>
                                                <p className="text-xs text-on-surface-variant truncate">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-on-surface-variant">{u.username}</td>
                                    <td className="px-5 py-3.5"><span className={`chip ${ROLE_TONE[u.role] || ''}`}>{ROLES[u.role] || u.role}</span></td>
                                    <td className="px-5 py-3.5">
                                        {tab === 'staff'
                                            ? (u.has_pin ? <span className="text-sage flex items-center gap-1"><Icon name="check" className="text-[16px]" /> Ada</span> : <span className="text-amber-700">Belum</span>)
                                            : (
                                                <span className="text-on-surface-variant">
                                                    {u.phone_number || '—'}
                                                    <button className="ml-3 chip border-sage/30 text-sage bg-sage-soft tabular" onClick={() => setPointsUser(u)} title="Riwayat & penyesuaian poin">{u.loyalty_points ?? 0} poin</button>
                                                </span>
                                            )}
                                    </td>
                                    <td className="px-5 py-3.5">{u.is_active === false ? <span className="text-error">Nonaktif</span> : <span className="text-on-surface-variant">Aktif</span>}</td>
                                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                        <button className="btn-icon btn-ghost" onClick={() => openForm(u)} aria-label="Ubah"><Icon name="edit" className="text-[18px]" /></button>
                                        {u.id !== me?.id && <button className="btn-icon btn-ghost hover:text-error" onClick={() => remove(u)} aria-label="Hapus"><Icon name="delete" className="text-[18px]" /></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {pointsUser && (
                <PointsModal user={pointsUser} onClose={() => setPointsUser(null)}
                    onChanged={(points) => setUsers((prev) => prev.map((u) => (u.id === pointsUser.id ? { ...u, loyalty_points: points } : u)))} />
            )}

            {form && (
                <Modal title={editing ? 'Ubah pengguna' : 'Tambah pengguna'} onClose={() => setForm(null)} size="lg"
                    footer={<><button className="btn-outline" onClick={() => setForm(null)}>Batal</button><button form="user-form" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button></>}>
                    <form id="user-form" onSubmit={submit} className="grid grid-cols-2 gap-5">
                        <Field label="Nama lengkap" className="col-span-2"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
                        <Field label="Username" hint={editing ? '' : 'Dibuat otomatis jika kosong.'}><input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
                        <Field label="Peran">
                            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                {Object.entries(ROLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </Field>
                        <Field label="Email" hint="Opsional untuk member yang didaftarkan kasir."><input className="input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                        <Field label="No. HP"><input className="input" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></Field>
                        <Field label="Password" hint={editing ? 'Kosongkan jika tidak diubah.' : 'Minimal 8 karakter.'} className="col-span-2">
                            <input className="input" type="password" minLength={8} required={!editing} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
                        </Field>
                        {isStaffForm && (
                            <Field label="PIN 4–6 digit" className="col-span-2"
                                hint={`${editing?.has_pin ? 'Kosongkan jika tidak diubah. ' : ''}Untuk ganti pengguna cepat${['owner', 'manager'].includes(form.role) ? ' dan menyetujui pembatalan/refund' : ''}.`}>
                                <input className="input tracking-[0.4em] tabular" type="password" inputMode="numeric" pattern="\d{4,6}" maxLength={6}
                                    value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} autoComplete="off" />
                            </Field>
                        )}
                        {editing?.has_pin && isStaffForm && (
                            <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.remove_pin} onChange={(e) => setForm({ ...form, remove_pin: e.target.checked })} /> Hapus PIN</label>
                        )}
                        {editing && editing.id !== me?.id && (
                            <label className="col-span-2 flex items-start gap-2 text-sm">
                                <input type="checkbox" className="mt-0.5" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                                <span>Akun aktif <span className="block text-xs text-on-surface-variant">Nonaktifkan untuk staf yang sudah tidak bekerja; akun langsung keluar dari semua perangkat.</span></span>
                            </label>
                        )}
                        {error && <p className="col-span-2 text-sm text-error" role="alert">{error}</p>}
                    </form>
                </Modal>
            )}
        </div>
    );
};

/** Riwayat poin member & penyesuaian manual (owner). */
const PointsModal = ({ user, onClose, onChanged }) => {
    const { notify } = useToast();
    const [data, setData] = useState(null);
    const [points, setPoints] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/admin/members/${user.id}/loyalty`).then((res) => setData(res.data.data)).catch(() => setData({ points: user.loyalty_points, transactions: [] }));
    }, [user]);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const res = await api.post(`/admin/members/${user.id}/points`, { points: Number(points), note: note.trim() });
            notify('Poin disesuaikan');
            onChanged(res.data.data.points);
            const fresh = await api.get(`/admin/members/${user.id}/loyalty`);
            setData(fresh.data.data);
            setPoints('');
            setNote('');
        } catch (err) {
            setError(apiErrorMessage(err, 'Gagal menyesuaikan poin.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title={`Poin ${user.name}`} subtitle={user.phone_number || user.email} onClose={onClose} size="md">
            {!data ? <LoadingBlock /> : (
                <div className="space-y-6">
                    <p className="font-display text-5xl tabular">{data.points} <span className="text-lg text-on-surface-variant font-sans">poin</span></p>
                    <form onSubmit={submit} className="grid grid-cols-[120px_1fr_auto] gap-2 items-start">
                        <input className="input tabular" type="number" required value={points} onChange={(e) => setPoints(e.target.value)} placeholder="+/- poin" aria-label="Jumlah poin" />
                        <input className="input" required minLength={3} maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan, mis. kompensasi" aria-label="Alasan" />
                        <button className="btn-primary" disabled={busy || !points || Number(points) === 0}>Simpan</button>
                    </form>
                    {error && <p className="text-sm text-error">{error}</p>}
                    <ul className="divide-y divide-hairline border-y border-hairline max-h-72 overflow-y-auto scroll-thin">
                        {data.transactions.length === 0 && <li className="py-6 text-center text-sm text-on-surface-variant">Belum ada riwayat poin.</li>}
                        {data.transactions.map((t) => (
                            <li key={t.id} className="flex justify-between gap-4 py-3 text-sm">
                                <span>
                                    {t.note || t.type}
                                    <span className="block text-xs text-on-surface-variant">{new Date(t.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}{t.creator ? ` · ${t.creator.name}` : ''}</span>
                                </span>
                                <span className={`tabular font-semibold ${t.points >= 0 ? 'text-sage' : 'text-error'}`}>{t.points >= 0 ? '+' : ''}{t.points}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Modal>
    );
};

export default UserManagement;
