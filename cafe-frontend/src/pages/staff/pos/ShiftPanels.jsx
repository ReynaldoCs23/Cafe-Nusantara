import { useState } from 'react';
import api from '../../../api/axios';
import { Field, Icon, Modal, Segmented } from '../../../components/ui';
import { PAYMENT_METHODS, apiErrorMessage, deviceName, formatDateTime, formatPrice } from '../../../utils/pos';
import { buildShiftReportHtml, printHtml } from '../../../utils/print';

/** Layar buka shift: muncul jika kasir belum punya shift terbuka (PRD SFT-01). */
export const OpenShiftScreen = ({ user, onOpened }) => {
    const [cash, setCash] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const res = await api.post('/admin/pos/shift/open', { opening_cash: Number(cash) || 0, device_name: deviceName() });
            onOpened(res.data.data);
        } catch (err) {
            setError(apiErrorMessage(err, 'Gagal membuka shift.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="h-full flex items-center justify-center p-6">
            <form onSubmit={submit} className="card w-full max-w-md p-10 animate-slide-up">
                <p className="label-caps mb-3">Mulai shift</p>
                <h1 className="font-display text-4xl text-ink mb-2">Selamat bertugas, {user?.name?.split(' ')[0]}.</h1>
                <p className="text-on-surface-variant mb-8">Hitung uang di laci kasir dan masukkan sebagai modal awal.</p>
                <Field label="Modal awal di laci (Rp)">
                    <input className="input-lg tabular" type="number" min="0" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0" autoFocus required />
                </Field>
                {error && <p className="text-sm text-error mt-3" role="alert">{error}</p>}
                <button type="submit" className="btn-primary btn-lg w-full mt-8" disabled={busy}>
                    <Icon name="lock_open" /> {busy ? 'Membuka...' : 'Buka Shift'}
                </button>
            </form>
        </div>
    );
};

const SummaryRow = ({ label, value, strong, negative }) => (
    <div className={`flex justify-between py-1.5 ${strong ? 'font-semibold text-ink' : 'text-on-surface-variant'}`}>
        <span>{label}</span>
        <span className="tabular">{negative && value ? '−' : ''}{formatPrice(value)}</span>
    </div>
);

/** Kas masuk/keluar dan tutup shift (PRD SFT-02..05). */
export const ShiftModal = ({ shift, onClose, onChanged, onClosed }) => {
    const [tab, setTab] = useState('summary');
    const [movement, setMovement] = useState({ type: 'out', amount: '', reason: '' });
    const [counted, setCounted] = useState('');
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const s = shift.summary;

    const run = async (fn) => {
        setBusy(true);
        setError('');
        try {
            await fn();
        } catch (err) {
            setError(apiErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const saveMovement = (e) => {
        e.preventDefault();
        run(async () => {
            const res = await api.post('/admin/pos/shift/movements', { ...movement, amount: Number(movement.amount) });
            setMovement({ type: movement.type, amount: '', reason: '' });
            onChanged(res.data.data);
            setTab('summary');
        });
    };

    const closeShift = (e) => {
        e.preventDefault();
        run(async () => {
            const res = await api.post('/admin/pos/shift/close', { counted_cash: Number(counted) || 0, notes: notes.trim() || null });
            printHtml(buildShiftReportHtml(res.data.data));
            onClosed(res.data.data);
        });
    };

    const diff = counted === '' ? null : Number(counted) - s.expected_cash;

    return (
        <Modal title="Shift kasir" subtitle={`Dibuka ${formatDateTime(shift.opened_at)}`} onClose={onClose} size="lg">
            <div className="mb-6">
                <Segmented value={tab} onChange={setTab} options={[
                    ['summary', 'Ringkasan', 'summarize'],
                    ['movement', 'Kas masuk/keluar', 'swap_vert'],
                    ['close', 'Tutup shift', 'lock'],
                ]} />
            </div>

            {tab === 'summary' && (
                <div className="grid sm:grid-cols-2 gap-8 text-sm">
                    <div>
                        <p className="label-caps mb-2">Kas laci</p>
                        <SummaryRow label="Modal awal" value={s.opening_cash} />
                        <SummaryRow label="Penjualan tunai" value={s.cash_sales} />
                        <SummaryRow label="Kas masuk" value={s.cash_in} />
                        <SummaryRow label="Kas keluar" value={s.cash_out} negative />
                        <SummaryRow label="Refund tunai" value={s.cash_refunds} negative />
                        <div className="border-t border-hairline mt-2 pt-2">
                            <SummaryRow label="Seharusnya di laci" value={s.expected_cash} strong />
                        </div>
                    </div>
                    <div>
                        <p className="label-caps mb-2">Penerimaan ({s.transaction_count} transaksi)</p>
                        {Object.keys(s.by_method || {}).length === 0 && <p className="text-on-surface-variant py-1.5">Belum ada pembayaran.</p>}
                        {Object.entries(s.by_method || {}).map(([m, v]) => (
                            <SummaryRow key={m} label={`${PAYMENT_METHODS[m] || m} (${v.count})`} value={v.amount} />
                        ))}
                        <div className="border-t border-hairline mt-2 pt-2">
                            <SummaryRow label="Total diterima" value={s.payments_total} strong />
                        </div>
                        {s.movements?.length > 0 && (
                            <>
                                <p className="label-caps mt-6 mb-2">Catatan kas</p>
                                {s.movements.map((m) => (
                                    <div key={m.id} className="flex justify-between py-1 text-on-surface-variant">
                                        <span>{m.type === 'in' ? 'Masuk' : 'Keluar'} · {m.reason}</span>
                                        <span className="tabular">{formatPrice(m.amount)}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}

            {tab === 'movement' && (
                <form onSubmit={saveMovement} className="space-y-4">
                    <Segmented value={movement.type} onChange={(type) => setMovement({ ...movement, type })} options={[['out', 'Kas keluar'], ['in', 'Kas masuk']]} />
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Nominal (Rp)">
                            <input className="input-lg tabular" type="number" min="1" required value={movement.amount} onChange={(e) => setMovement({ ...movement, amount: e.target.value })} />
                        </Field>
                        <Field label="Alasan">
                            <input className="input-lg" required minLength={3} maxLength={255} value={movement.reason} onChange={(e) => setMovement({ ...movement, reason: e.target.value })}
                                placeholder={movement.type === 'out' ? 'Mis. beli es batu' : 'Mis. tambahan uang kecil'} />
                        </Field>
                    </div>
                    {error && <p className="text-sm text-error">{error}</p>}
                    <button className="btn-primary" disabled={busy}>Simpan</button>
                </form>
            )}

            {tab === 'close' && (
                <form onSubmit={closeShift} className="space-y-5">
                    {(shift.warnings?.unpaid_orders > 0 || shift.warnings?.active_orders > 0) && (
                        <div className="rounded-xl bg-amber-soft border border-amber-200 px-4 py-3 text-sm text-amber-900 flex gap-3">
                            <Icon name="warning" />
                            <span>Masih ada {shift.warnings.unpaid_orders} pesanan belum dibayar dan {shift.warnings.active_orders} pesanan aktif. Pastikan sudah diserahkan ke shift berikutnya.</span>
                        </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="rounded-xl bg-surface-container-low px-5 py-4">
                            <p className="label-caps mb-1">Seharusnya di laci</p>
                            <p className="font-display text-3xl tabular">{formatPrice(s.expected_cash)}</p>
                        </div>
                        <Field label="Uang dihitung (Rp)">
                            <input className="input-lg tabular" type="number" min="0" required value={counted} onChange={(e) => setCounted(e.target.value)} autoFocus />
                        </Field>
                    </div>
                    {diff !== null && (
                        <p className={`text-sm font-semibold ${diff === 0 ? 'text-sage' : 'text-error'}`}>
                            {diff === 0 ? 'Kas cocok.' : `Selisih ${diff > 0 ? 'lebih' : 'kurang'} ${formatPrice(Math.abs(diff))}.`}
                        </p>
                    )}
                    <Field label="Catatan (opsional)">
                        <input className="input" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
                    </Field>
                    {error && <p className="text-sm text-error">{error}</p>}
                    <button className="btn-danger" disabled={busy}><Icon name="lock" className="text-[18px]" /> Tutup shift & cetak laporan</button>
                </form>
            )}
        </Modal>
    );
};
