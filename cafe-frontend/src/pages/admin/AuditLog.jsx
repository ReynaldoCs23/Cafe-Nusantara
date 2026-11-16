import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { EmptyState, Icon, LoadingBlock, PageHeader, useToast } from '../../components/ui';
import { ROLES, apiErrorMessage, formatDateTime } from '../../utils/pos';

const GROUPS = [
    ['', 'Semua'],
    ['order', 'Pesanan'],
    ['product', 'Produk'],
    ['shift', 'Shift & kas'],
    ['user', 'Pengguna'],
    ['settings', 'Pengaturan'],
    ['table', 'Meja'],
    ['category', 'Kategori'],
];

const ACTION_LABELS = {
    'order.discount': ['Diskon', 'sell'],
    'order.refunded': ['Refund', 'currency_exchange'],
    'order.cancelled': ['Batal', 'cancel'],
    'order.item_voided': ['Void item', 'remove_shopping_cart'],
    'product.created': ['Produk baru', 'add_circle'],
    'product.updated': ['Produk diubah', 'edit'],
    'product.deleted': ['Produk dihapus', 'delete'],
    'product.stock_adjusted': ['Koreksi stok', 'inventory'],
    'category.created': ['Kategori baru', 'add_circle'],
    'category.updated': ['Kategori diubah', 'edit'],
    'category.deleted': ['Kategori dihapus', 'delete'],
    'modifier_group.created': ['Grup pilihan baru', 'add_circle'],
    'modifier_group.updated': ['Grup pilihan diubah', 'edit'],
    'modifier_group.deleted': ['Grup pilihan dihapus', 'delete'],
    'user.created': ['Pengguna baru', 'person_add'],
    'user.updated': ['Pengguna diubah', 'manage_accounts'],
    'user.deleted': ['Pengguna dihapus', 'person_remove'],
    'table.created': ['Meja baru', 'add_circle'],
    'table.updated': ['Meja diubah', 'edit'],
    'table.deleted': ['Meja dihapus', 'delete'],
    'table.qr_rotated': ['QR dibuat ulang', 'autorenew'],
    'settings.updated': ['Pengaturan diubah', 'tune'],
    'shift.opened': ['Buka shift', 'lock_open'],
    'shift.closed': ['Tutup shift', 'lock'],
    'shift.cash_in': ['Kas masuk', 'south_west'],
    'shift.cash_out': ['Kas keluar', 'north_east'],
};

const FIELD_LABELS = {
    price: 'Harga', name: 'Nama', is_active: 'Tampil', is_available: 'Tersedia', stock_quantity: 'Stok', role: 'Peran',
    pin_hash: 'PIN', password: 'Password', tax_rate: 'Pajak', service_charge_rate: 'Service', discount_total: 'Diskon',
    station: 'Stasiun', category_id: 'Kategori', track_stock: 'Hitung stok', email: 'Email', username: 'Username',
};

const show = (v) => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
};

/** Log aktivitas staf (PRD USR-03). */
const AuditLog = () => {
    const { notify } = useToast();
    const [group, setGroup] = useState('');
    const [date, setDate] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [expanded, setExpanded] = useState(null);

    const load = useCallback(async () => {
        const res = await api.get('/admin/audit-logs', { params: { action: group || undefined, date: date || undefined, q: query.trim() || undefined, page } });
        setData(res.data);
    }, [group, date, query, page]);

    useEffect(() => {
        const timer = setTimeout(() => load().catch((err) => notify(apiErrorMessage(err, 'Gagal memuat log.'), 'error')), 250);
        return () => clearTimeout(timer);
    }, [load, notify]);

    const changeFilter = (setter) => (value) => { setter(value); setPage(1); };

    return (
        <div className="animate-fade-in">
            <PageHeader eyebrow="Bisnis" title="Log Aktivitas" description="Riwayat tindakan penting staf: harga, stok, diskon, pembatalan, refund, kas, pengguna, dan pengaturan." />

            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                    {GROUPS.map(([key, label]) => (
                        <button key={key} className={group === key ? 'tab-active' : 'tab'} onClick={() => changeFilter(setGroup)(key)}>{label}</button>
                    ))}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <input type="date" className="input py-2 w-auto" value={date} onChange={(e) => changeFilter(setDate)(e.target.value)} aria-label="Tanggal" />
                    <div className="relative w-56">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
                        <input type="search" className="input pl-10 py-2" value={query} onChange={(e) => changeFilter(setQuery)(e.target.value)} placeholder="Cari keterangan" />
                    </div>
                </div>
            </div>

            {!data ? <LoadingBlock /> : data.data.length === 0 ? (
                <div className="card"><EmptyState icon="history" title="Belum ada aktivitas" description="Coba filter atau tanggal lain." /></div>
            ) : (
                <div className="card divide-y divide-hairline">
                    {data.data.map((log) => {
                        const [label, icon] = ACTION_LABELS[log.action] || [log.action, 'history'];
                        const hasChanges = log.changes && Object.keys(log.changes).length > 0;
                        return (
                            <div key={log.id} className="px-6 py-4">
                                <div className="flex items-start gap-4">
                                    <span className="h-9 w-9 shrink-0 rounded-full bg-surface-container flex items-center justify-center"><Icon name={icon} className="text-[18px]" /></span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm"><span className="font-semibold">{label}</span>{log.description && <span className="text-on-surface-variant"> · {log.description}</span>}</p>
                                        <p className="text-xs text-on-surface-variant mt-1">
                                            {formatDateTime(log.created_at)} · {log.user ? `${log.user.name} (${ROLES[log.user.role] || log.user.role})` : 'Sistem'}{log.ip ? ` · ${log.ip}` : ''}
                                        </p>
                                    </div>
                                    {hasChanges && (
                                        <button className="btn-ghost text-xs" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                                            {expanded === log.id ? 'Tutup' : 'Detail'} <Icon name={expanded === log.id ? 'expand_less' : 'expand_more'} className="text-[16px]" />
                                        </button>
                                    )}
                                </div>
                                {expanded === log.id && hasChanges && (
                                    <table className="mt-3 ml-13 text-xs w-[calc(100%-3.25rem)]">
                                        <tbody className="divide-y divide-hairline">
                                            {Object.entries(log.changes).map(([field, change]) => (
                                                <tr key={field}>
                                                    <td className="py-1.5 pr-4 text-on-surface-variant w-40">{FIELD_LABELS[field] || field}</td>
                                                    <td className="py-1.5 pr-4 line-through text-on-surface-variant break-all">{show(change.from)}</td>
                                                    <td className="py-1.5 font-medium break-all">{show(change.to)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {data && data.last_page > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6 text-sm">
                    <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Icon name="chevron_left" className="text-[18px]" /> Sebelumnya</button>
                    <span className="text-on-surface-variant tabular">{data.current_page} / {data.last_page}</span>
                    <button className="btn-outline" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>Berikutnya <Icon name="chevron_right" className="text-[18px]" /></button>
                </div>
            )}
        </div>
    );
};

export default AuditLog;
