import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useStaffOrders } from '../../hooks/useStaffOrders';
import { EmptyState, Field, Icon, LoadingBlock, Modal, StatusBadge, useToast } from '../../components/ui';
import { ConnectionDot } from '../../components/staff/StaffShell';
import PaymentModal from '../staff/pos/PaymentModal';
import {
    CHANNELS, FULFILLMENTS, ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS,
    apiErrorMessage, formatDateTime, formatPrice, formatTime, localDateString, modifierSummary,
} from '../../utils/pos';
import { printReceipt } from '../../utils/print';

const FILTERS = [
    { key: 'all', label: 'Semua', match: () => true },
    { key: 'unpaid', label: 'Belum dibayar', match: (o) => o.status === 'pending_payment' },
    { key: 'active', label: 'Aktif', match: (o) => ['queued', 'preparing', 'ready'].includes(o.status) },
    { key: 'done', label: 'Selesai', match: (o) => o.status === 'completed' },
    { key: 'cancelled', label: 'Batal', match: (o) => o.status === 'cancelled' },
];

const Info = ({ label, value }) => (
    <div>
        <p className="label-caps mb-1">{label}</p>
        <p className="text-ink">{value}</p>
    </div>
);

const Money = ({ label, value, strong }) => (
    <div className={`flex justify-between ${strong ? 'text-ink font-semibold' : 'text-on-surface-variant'}`}>
        <span>{label}</span>
        <span className="tabular">{formatPrice(value)}</span>
    </div>
);

/** Semua pesanan per tanggal: cari, filter, terima pembayaran, ubah status, batalkan. */
const OrderManagement = () => {
    const { hasRole } = useAuth();
    const { notify } = useToast();
    const canTakePayment = hasRole('owner', 'manager', 'cashier');
    const isManager = hasRole('owner', 'manager');

    const [orders, setOrders] = useState(null);
    const [date, setDate] = useState(localDateString());
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [busy, setBusy] = useState(false);
    const [paying, setPaying] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const selectedRef = useRef(null);

    const loadOrders = useCallback(async () => {
        const res = await api.get('/admin/orders', { params: { date } });
        setOrders(res.data.data || []);
    }, [date]);

    const loadDetail = useCallback(async (id) => {
        if (!id) return setDetail(null);
        const res = await api.get(`/admin/orders/${id}`);
        setDetail(res.data.data);
    }, []);

    useEffect(() => {
        setOrders(null);
        loadOrders().catch((err) => notify(apiErrorMessage(err, 'Gagal memuat pesanan.'), 'error'));
    }, [loadOrders, notify]);

    useEffect(() => {
        selectedRef.current = selectedId;
        loadDetail(selectedId).catch(() => setDetail(null));
    }, [selectedId, loadDetail]);

    const connection = useStaffOrders((_, order) => {
        loadOrders().catch(() => {});
        if (selectedRef.current === order?.id) loadDetail(order.id).catch(() => {});
    }, { pollMs: 15000, onPoll: () => loadOrders().catch(() => {}) });

    const visible = useMemo(() => {
        const f = FILTERS.find((x) => x.key === filter) || FILTERS[0];
        const q = query.trim().toLowerCase();
        return (orders || []).filter(f.match).filter((o) => !q || [o.order_number, o.customer_name, o.customer_phone, o.dining_table?.name, String(o.queue_number)]
            .some((v) => (v || '').toLowerCase().includes(q)));
    }, [orders, filter, query]);

    const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, (orders || []).filter(f.match).length])), [orders]);
    const selected = detail?.id === selectedId ? detail : (orders || []).find((o) => o.id === selectedId);
    const paidAmount = (detail?.payments || []).filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

    const refresh = async () => {
        await Promise.all([loadOrders(), loadDetail(selectedId)]);
    };

    const changeStatus = async (status, reason = null) => {
        setBusy(true);
        try {
            await api.put(`/admin/orders/${selected.id}/status`, { status, reason });
            notify(`#${selected.queue_number}: ${ORDER_STATUS[status].label}`);
            await refresh();
        } catch (err) {
            notify(apiErrorMessage(err, 'Gagal mengubah status.'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const shiftDate = (days) => {
        const d = new Date(`${date}T12:00:00`);
        d.setDate(d.getDate() + days);
        setDate(localDateString(d));
    };

    return (
        <div className="animate-fade-in -mx-10 -my-10 h-screen flex flex-col">
            {/* Toolbar */}
            <div className="px-10 pt-10 pb-6 border-b border-hairline">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                    <div>
                        <p className="label-caps mb-2">Operasional</p>
                        <h1 className="page-title">Semua Pesanan</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <ConnectionDot state={connection} />
                        <div className="flex items-center rounded-lg border border-hairline bg-paper">
                            <button className="btn-icon btn-ghost" onClick={() => shiftDate(-1)} aria-label="Hari sebelumnya"><Icon name="chevron_left" /></button>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent text-sm px-2 py-2 border-0 focus:ring-0" />
                            <button className="btn-icon btn-ghost" onClick={() => shiftDate(1)} aria-label="Hari berikutnya"><Icon name="chevron_right" /></button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                        {FILTERS.map((f) => (
                            <button key={f.key} onClick={() => setFilter(f.key)} className={filter === f.key ? 'tab-active' : 'tab'}>
                                {f.label} <span className="opacity-60 tabular">{counts[f.key] || 0}</span>
                            </button>
                        ))}
                    </div>
                    <div className="relative ml-auto w-full sm:w-72">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
                        <input type="search" className="input pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nomor, nama, meja, antrean" />
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-[minmax(300px,380px)_1fr]">
                {/* Daftar */}
                <div className="border-r border-hairline overflow-y-auto scroll-thin">
                    {!orders ? <LoadingBlock /> : visible.length === 0 ? (
                        <EmptyState icon="receipt_long" title="Tidak ada pesanan" description="Coba tanggal atau filter lain." />
                    ) : (
                        <ul className="divide-y divide-hairline">
                            {visible.map((o) => (
                                <li key={o.id}>
                                    <button onClick={() => setSelectedId(o.id)}
                                        className={`w-full text-left px-6 py-4 transition-colors ${selectedId === o.id ? 'bg-paper border-l-2 border-primary' : 'hover:bg-paper/70 border-l-2 border-transparent'}`}>
                                        <div className="flex items-baseline justify-between gap-3">
                                            <span className="font-display text-2xl tabular">#{o.queue_number ?? '–'}</span>
                                            <span className="text-sm font-medium tabular">{formatPrice(o.grand_total)}</span>
                                        </div>
                                        <p className="font-medium truncate mt-0.5">{o.customer_name || 'Tamu'}</p>
                                        <div className="flex items-center justify-between gap-2 mt-2">
                                            <span className="text-xs text-on-surface-variant truncate">
                                                {formatTime(o.created_at)} · {CHANNELS[o.channel]} · {o.dining_table?.name || FULFILLMENTS[o.fulfillment]}
                                            </span>
                                            <StatusBadge status={o.status} />
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Detail */}
                <div className="overflow-y-auto scroll-thin bg-paper/40">
                    {!selected ? (
                        <EmptyState icon="touch_app" title="Pilih pesanan" description="Detail, pembayaran, dan riwayat status akan tampil di sini." />
                    ) : (
                        <div className="px-10 py-8 max-w-4xl">
                            <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-hairline">
                                <div>
                                    <p className="label-caps mb-1">{selected.order_number}</p>
                                    <h2 className="font-display text-4xl">#{selected.queue_number} · {selected.customer_name || 'Tamu'}</h2>
                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        <StatusBadge status={selected.status} />
                                        <span className="chip border-hairline text-on-surface-variant">{PAYMENT_STATUS[selected.payment_status]}</span>
                                        <span className="chip border-hairline text-on-surface-variant">{formatDateTime(selected.created_at)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selected.payment_status !== 'unpaid' && canTakePayment && (
                                        <button className="btn-outline" onClick={() => printReceipt(selected.id).catch(() => notify('Struk gagal dicetak', 'error'))}>
                                            <Icon name="print" className="text-[18px]" /> Struk
                                        </button>
                                    )}
                                    {selected.status === 'pending_payment' && canTakePayment && (
                                        <button className="btn-primary" disabled={busy} onClick={() => setPaying(true)}><Icon name="payments" className="text-[18px]" /> Terima pembayaran</button>
                                    )}
                                    {selected.status === 'queued' && (
                                        <button className="btn-outline" disabled={busy} onClick={() => changeStatus('preparing')}><Icon name="local_cafe" className="text-[18px]" /> Mulai buat</button>
                                    )}
                                    {['queued', 'preparing'].includes(selected.status) && (
                                        <button className="btn-primary" disabled={busy} onClick={() => changeStatus('ready')}><Icon name="done_all" className="text-[18px]" /> Tandai siap</button>
                                    )}
                                    {selected.status === 'ready' && (
                                        <>
                                            <button className="btn-outline" disabled={busy} onClick={() => {
                                                const reason = window.prompt('Alasan membuat ulang:');
                                                if (reason?.trim()) changeStatus('preparing', reason.trim());
                                            }}><Icon name="replay" className="text-[18px]" /> Buat ulang</button>
                                            <button className="btn-sage" disabled={busy} onClick={() => changeStatus('completed')}>
                                                <Icon name={selected.fulfillment === 'table' ? 'room_service' : 'shopping_bag'} className="text-[18px]" />
                                                {selected.fulfillment === 'table' ? 'Sudah diantar' : 'Sudah diambil'}
                                            </button>
                                        </>
                                    )}
                                    {canTakePayment && ['pending_payment', 'queued', 'preparing', 'ready'].includes(selected.status) && (
                                        <button className="btn-danger" disabled={busy} onClick={() => setCancelling(true)}><Icon name="cancel" className="text-[18px]" /> Batalkan</button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 text-sm border-b border-hairline">
                                <Info label="Kanal" value={CHANNELS[selected.channel]} />
                                <Info label="Penyerahan" value={FULFILLMENTS[selected.fulfillment]} />
                                <Info label="Meja" value={selected.dining_table?.name || '–'} />
                                <Info label="No. HP" value={selected.customer_phone || '–'} />
                            </div>

                            {selected.notes && <p className="mt-6 rounded-lg bg-amber-soft px-4 py-3 text-sm text-amber-900">Catatan: {selected.notes}</p>}
                            {selected.remarks && <p className="mt-6 rounded-lg bg-[#fff4f2] border border-error/25 px-4 py-3 text-sm text-error">{selected.remarks}</p>}
                            {selected.cancel_reason && <p className="mt-6 rounded-lg bg-[#fff4f2] border border-error/25 px-4 py-3 text-sm text-error">Dibatalkan: {selected.cancel_reason}</p>}

                            <section className="mt-8">
                                <p className="label-caps mb-3">Item</p>
                                <ul className="divide-y divide-hairline border-y border-hairline">
                                    {selected.items?.map((item) => (
                                        <li key={item.id} className={`flex justify-between gap-6 py-4 ${item.status === 'voided' ? 'opacity-45 line-through' : ''}`}>
                                            <div className="flex gap-4">
                                                <span className="font-semibold tabular w-8">{item.quantity}×</span>
                                                <div>
                                                    <p className="font-medium">{item.product_name}</p>
                                                    {item.modifiers?.length > 0 && <p className="text-xs text-on-surface-variant">{modifierSummary(item.modifiers)}</p>}
                                                    {item.notes && <p className="text-xs italic text-on-surface-variant">“{item.notes}”</p>}
                                                    <p className="text-xs text-on-surface-variant mt-0.5">{item.station === 'kitchen' ? 'Dapur' : 'Bar'} · {formatPrice(item.unit_price + (item.modifiers_total || 0))}/item</p>
                                                </div>
                                            </div>
                                            <span className="tabular">{formatPrice(item.line_total)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <div className="grid md:grid-cols-2 gap-10 mt-8">
                                <section className="space-y-6">
                                    <div>
                                        <p className="label-caps mb-3">Pembayaran</p>
                                        {(detail?.payments || []).length === 0 && <p className="text-sm text-on-surface-variant">Belum ada pembayaran.</p>}
                                        <div className="space-y-2 text-sm">
                                            {(detail?.payments || []).map((p) => (
                                                <div key={p.id} className="flex justify-between gap-4">
                                                    <span>
                                                        {PAYMENT_METHODS[p.method] || p.method}{p.reference ? ` · ${p.reference}` : ''}
                                                        <span className="block text-xs text-on-surface-variant">{formatTime(p.paid_at)}{p.receiver ? ` · ${p.receiver.name}` : ''}{p.change ? ` · kembali ${formatPrice(p.change)}` : ''}</span>
                                                    </span>
                                                    <span className="tabular">{formatPrice(p.amount)}</span>
                                                </div>
                                            ))}
                                            {(detail?.refunds || []).map((r) => (
                                                <div key={`r${r.id}`} className="flex justify-between gap-4 text-error">
                                                    <span>Refund · {r.reason}</span>
                                                    <span className="tabular">−{formatPrice(r.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {(detail?.status_logs || []).length > 0 && (
                                        <div>
                                            <p className="label-caps mb-3">Riwayat</p>
                                            <ol className="relative border-l border-hairline ml-1.5 space-y-3">
                                                {detail.status_logs.map((log) => (
                                                    <li key={log.id} className="pl-5 relative text-sm">
                                                        <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-paper border-2 border-primary" />
                                                        <span className="font-medium">{ORDER_STATUS[log.to]?.label || log.to}</span>
                                                        <span className="text-on-surface-variant"> · {formatTime(log.created_at)} · {log.user?.name || 'Sistem'}</span>
                                                        {log.reason && <span className="block text-xs text-on-surface-variant">{log.reason}</span>}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}
                                </section>

                                <section className="card p-6 space-y-2 text-sm self-start">
                                    <Money label="Subtotal" value={selected.subtotal} />
                                    {selected.discount_total > 0 && <Money label="Diskon" value={-selected.discount_total} />}
                                    {selected.service_charge > 0 && <Money label="Service charge" value={selected.service_charge} />}
                                    <Money label="Pajak" value={selected.tax_amount} />
                                    {selected.rounding !== 0 && <Money label="Pembulatan" value={selected.rounding} />}
                                    <div className="flex justify-between items-end border-t border-hairline pt-3 mt-3">
                                        <span className="label-caps">Total</span>
                                        <span className="font-display text-3xl text-primary tabular">{formatPrice(selected.grand_total)}</span>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {paying && selected && (
                <PaymentModal title={`Bayar pesanan #${selected.queue_number}`} subtitle={selected.customer_name}
                    total={selected.grand_total} alreadyPaid={paidAmount}
                    onClose={() => setPaying(false)}
                    onSubmit={async (lines) => {
                        for (const line of lines) await api.post(`/admin/orders/${selected.id}/payments`, line);
                        setPaying(false);
                        notify('Pembayaran tercatat');
                        await refresh();
                    }} />
            )}

            {cancelling && selected && (
                <CancelModal order={selected} needsPin={!isManager && selected.status !== 'pending_payment'}
                    onClose={() => setCancelling(false)}
                    onDone={async () => { setCancelling(false); notify('Pesanan dibatalkan'); await refresh(); }} />
            )}
        </div>
    );
};

const CancelModal = ({ order, needsPin, onClose, onDone }) => {
    const [reason, setReason] = useState('');
    const [approver, setApprover] = useState('');
    const [pin, setPin] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await api.post(`/admin/orders/${order.id}/cancel`, {
                reason: reason.trim(),
                ...(needsPin ? { approver_username: approver.trim(), approver_pin: pin } : {}),
            });
            onDone();
        } catch (err) {
            setError(apiErrorMessage(err, 'Gagal membatalkan pesanan.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title={`Batalkan #${order.queue_number}`} subtitle={order.customer_name} onClose={onClose} size="md"
            footer={<><button className="btn-outline" onClick={onClose}>Kembali</button><button form="cancel-form" className="btn-danger" disabled={busy}>{busy ? 'Memproses...' : 'Batalkan pesanan'}</button></>}>
            <form id="cancel-form" onSubmit={submit} className="space-y-4">
                {order.payment_status === 'paid' && (
                    <p className="rounded-lg bg-amber-soft px-4 py-3 text-sm text-amber-900">
                        Pesanan sudah lunas. Refund {formatPrice(order.grand_total)} dicatat otomatis. Kembalikan uang sesuai metode bayarnya.
                    </p>
                )}
                <Field label="Alasan pembatalan">
                    <input className="input" required minLength={3} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
                </Field>
                {needsPin && (
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Username manager"><input className="input" required value={approver} onChange={(e) => setApprover(e.target.value)} autoComplete="off" /></Field>
                        <Field label="PIN manager"><input className="input" type="password" inputMode="numeric" required value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="off" /></Field>
                    </div>
                )}
                {error && <p className="text-sm text-error" role="alert">{error}</p>}
            </form>
        </Modal>
    );
};

export default OrderManagement;
