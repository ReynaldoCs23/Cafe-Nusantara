import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { EmptyState, Field, Icon, LoadingBlock, Modal, PageHeader, useToast } from '../../components/ui';
import { apiErrorMessage } from '../../utils/pos';
import { printHtml } from '../../utils/print';
import { buildQrSheetHtml, downloadDataUrl, qrDataUrl } from '../../utils/qr';
import { isLocalOrigin, publicOrigin, tableUrl } from '../../utils/table';
import { useStoreSettings } from '../../hooks/useStoreSettings';

const blank = { name: '', area: '', capacity: 2, is_active: true };

const QrImage = ({ token, className = '' }) => {
    const [src, setSrc] = useState(null);
    useEffect(() => {
        let active = true;
        qrDataUrl(token).then((url) => active && setSrc(url)).catch(() => {});
        return () => { active = false; };
    }, [token]);
    return src ? <img src={src} alt="Kode QR meja" className={className} /> : <div className={`${className} bg-surface-container animate-pulse`} />;
};

/** Meja & QR pemesanan (PRD TBL-01..03, QR-07). */
const TableManagement = () => {
    const { notify } = useToast();
    const settings = useStoreSettings();
    const [tables, setTables] = useState(null);
    const [form, setForm] = useState(null);
    const [qrTable, setQrTable] = useState(null);
    const [saving, setSaving] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        const res = await api.get('/admin/tables');
        setTables(res.data.data);
        return res.data.data;
    }, []);

    useEffect(() => {
        load().catch((err) => notify(apiErrorMessage(err, 'Gagal memuat meja.'), 'error'));
    }, [load, notify]);

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        const payload = { name: form.name.trim(), area: form.area.trim() || null, capacity: Number(form.capacity) || 2, is_active: form.is_active };
        try {
            if (form.id) await api.put(`/admin/tables/${form.id}`, payload);
            else await api.post('/admin/tables', payload);
            notify(form.id ? 'Meja diperbarui' : 'Meja ditambahkan');
            setForm(null);
            await load();
        } catch (err) {
            setError(apiErrorMessage(err, 'Gagal menyimpan meja.'));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (table) => {
        if (!window.confirm(`Hapus ${table.name}? QR meja ini tidak akan berlaku lagi.`)) return;
        try {
            await api.delete(`/admin/tables/${table.id}`);
            notify('Meja dihapus');
            setQrTable(null);
            await load();
        } catch (err) {
            notify(apiErrorMessage(err), 'error');
        }
    };

    const rotate = async (table) => {
        if (!window.confirm(`Buat QR baru untuk ${table.name}? QR lama yang sudah tercetak langsung tidak berlaku.`)) return;
        try {
            const res = await api.post(`/admin/tables/${table.id}/rotate-qr`);
            notify(res.data.message);
            const list = await load();
            setQrTable(list.find((t) => t.id === table.id) || null);
        } catch (err) {
            notify(apiErrorMessage(err), 'error');
        }
    };

    const download = async (table) => {
        const url = await qrDataUrl(table.qr_token);
        downloadDataUrl(url, `QR-${table.name.replace(/\s+/g, '-')}.png`);
    };

    const copyLink = async (table) => {
        try {
            await navigator.clipboard.writeText(tableUrl(table.qr_token));
            notify('Tautan meja disalin');
        } catch {
            notify('Tidak dapat menyalin tautan', 'error');
        }
    };

    const printSheet = async (list) => {
        if (list.length === 0) return;
        setPrinting(true);
        try {
            printHtml(await buildQrSheetHtml(list, settings?.store_name || 'Cafe Nusantara'), 1200);
        } finally {
            setTimeout(() => setPrinting(false), 1200);
        }
    };

    if (!tables) return <LoadingBlock />;

    const activeTables = tables.filter((t) => t.is_active);
    const areas = [...new Set(tables.map((t) => t.area || 'Tanpa area'))];

    return (
        <div className="animate-fade-in">
            <PageHeader eyebrow="Toko" title="Meja & QR"
                description="Setiap meja punya QR unik. Pelanggan scan QR untuk memesan dari meja; pesanan otomatis tercatat dengan nomor meja."
                actions={
                    <>
                        <button className="btn-outline" onClick={() => printSheet(activeTables)} disabled={printing || activeTables.length === 0}>
                            <Icon name="print" className="text-[18px]" /> {printing ? 'Menyiapkan...' : `Cetak semua QR (${activeTables.length})`}
                        </button>
                        <button className="btn-primary" onClick={() => { setError(''); setForm({ ...blank }); }}><Icon name="add" className="text-[18px]" /> Tambah meja</button>
                    </>
                } />

            {isLocalOrigin() && (
                <div className="mb-8 flex gap-3 rounded-xl bg-amber-soft border border-amber-200 px-5 py-4 text-sm text-amber-900">
                    <Icon name="warning" />
                    <span>
                        QR saat ini mengarah ke <strong>{publicOrigin()}</strong>, yang hanya bisa dibuka dari komputer ini.
                        Sebelum mencetak QR untuk pelanggan, isi <code className="px-1 rounded bg-white/70">VITE_PUBLIC_URL</code> dengan domain website cafe (mis. https://cafenusantara.id) lalu build ulang frontend.
                    </span>
                </div>
            )}

            {tables.length === 0 ? (
                <div className="card"><EmptyState icon="table_restaurant" title="Belum ada meja" description="Tambahkan meja, lalu cetak QR-nya untuk dipasang di stand meja." /></div>
            ) : (
                <div className="space-y-10">
                    {areas.map((area) => (
                        <section key={area}>
                            <p className="label-caps mb-4">{area}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {tables.filter((t) => (t.area || 'Tanpa area') === area).map((t) => (
                                    <button key={t.id} onClick={() => setQrTable(t)}
                                        className={`card p-5 text-left transition-colors hover:border-ink/30 ${t.is_active ? '' : 'opacity-50'}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-display text-2xl leading-tight">{t.name}</p>
                                                <p className="text-xs text-on-surface-variant mt-1">{t.capacity} kursi{t.is_active ? '' : ' · nonaktif'}</p>
                                            </div>
                                            <QrImage token={t.qr_token} className="h-14 w-14 rounded-md" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {qrTable && (
                <Modal title={qrTable.name} subtitle={[qrTable.area, `${qrTable.capacity} kursi`, qrTable.is_active ? null : 'Nonaktif'].filter(Boolean).join(' · ')} onClose={() => setQrTable(null)} size="md"
                    footer={
                        <>
                            <button className="btn-ghost hover:text-error mr-auto" onClick={() => remove(qrTable)}><Icon name="delete" className="text-[18px]" /> Hapus</button>
                            <button className="btn-outline" onClick={() => { setQrTable(null); setError(''); setForm({ ...qrTable, area: qrTable.area || '' }); }}><Icon name="edit" className="text-[18px]" /> Ubah</button>
                            <button className="btn-primary" onClick={() => printSheet([qrTable])}><Icon name="print" className="text-[18px]" /> Cetak QR</button>
                        </>
                    }>
                    <div className="flex flex-col items-center text-center">
                        <QrImage token={qrTable.qr_token} className="h-64 w-64 rounded-xl border border-hairline" />
                        <p className="mt-4 text-xs text-on-surface-variant break-all max-w-sm">{tableUrl(qrTable.qr_token)}</p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                            <button className="btn-outline text-xs" onClick={() => download(qrTable)}><Icon name="download" className="text-[16px]" /> Unduh PNG</button>
                            <button className="btn-outline text-xs" onClick={() => copyLink(qrTable)}><Icon name="link" className="text-[16px]" /> Salin tautan</button>
                            <a className="btn-outline text-xs" href={tableUrl(qrTable.qr_token)} target="_blank" rel="noopener noreferrer"><Icon name="open_in_new" className="text-[16px]" /> Coba buka</a>
                        </div>
                        <div className="mt-8 w-full rounded-xl bg-surface-container-low px-5 py-4 text-left text-sm flex gap-3">
                            <Icon name="autorenew" className="text-on-surface-variant" />
                            <div className="flex-1">
                                <p className="font-medium">QR disalahgunakan?</p>
                                <p className="text-on-surface-variant text-xs mt-0.5">Buat QR baru agar QR lama yang sudah tersebar tidak bisa dipakai lagi.</p>
                            </div>
                            <button className="btn-ghost text-xs self-center" onClick={() => rotate(qrTable)}>Buat QR baru</button>
                        </div>
                    </div>
                </Modal>
            )}

            {form && (
                <Modal title={form.id ? 'Ubah meja' : 'Tambah meja'} onClose={() => setForm(null)} size="sm"
                    footer={<><button className="btn-outline" onClick={() => setForm(null)}>Batal</button><button className="btn-primary" form="table-form" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button></>}>
                    <form id="table-form" onSubmit={save} className="space-y-4">
                        <Field label="Nama / nomor meja"><input className="input" required maxLength={50} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mis. Meja 5" autoFocus /></Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Area"><input className="input" maxLength={50} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Indoor" /></Field>
                            <Field label="Kapasitas"><input className="input" type="number" min="1" max="50" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
                        </div>
                        <label className="flex items-start gap-2 text-sm">
                            <input type="checkbox" className="mt-0.5" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                            <span>Meja aktif <span className="block text-xs text-on-surface-variant">QR meja nonaktif menolak pesanan.</span></span>
                        </label>
                        {error && <p className="text-sm text-error">{error}</p>}
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default TableManagement;
