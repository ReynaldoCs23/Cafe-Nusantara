import { useState } from 'react';
import api from '../../../api/axios';
import { EmptyState, Icon, StatusBadge, minutesSince, useNow, useToast } from '../../../components/ui';
import { CHANNELS, FULFILLMENTS, apiErrorMessage, formatPrice, modifierSummary } from '../../../utils/pos';
import PaymentModal from './PaymentModal';

/**
 * Daftar pesanan untuk kasir:
 * - mode "unpaid": pesanan QR/online/bayar-nanti yang menunggu pembayaran
 * - mode "ready": pesanan siap yang harus diserahkan di kasir
 */
const OrderListPanel = ({ mode, orders, onChanged, onPaid }) => {
    const { notify } = useToast();
    const now = useNow(30000);
    const [selectedId, setSelectedId] = useState(null);
    const [paying, setPaying] = useState(false);
    const [busy, setBusy] = useState(false);
    const selected = orders.find((o) => o.id === selectedId) || orders[0] || null;

    const act = async (fn, message) => {
        setBusy(true);
        try {
            await fn();
            if (message) notify(message);
            await onChanged();
        } catch (err) {
            notify(apiErrorMessage(err), 'error');
        } finally {
            setBusy(false);
        }
    };

    const voidItem = (item) => {
        const reason = window.prompt(`Alasan void ${item.quantity}x ${item.product_name}:`);
        if (!reason || reason.trim().length < 3) return;
        act(() => api.post(`/admin/pos/order-items/${item.id}/void`, { reason: reason.trim() }), 'Item di-void, total diperbarui');
    };

    const cancel = () => {
        const reason = window.prompt('Alasan membatalkan pesanan:');
        if (!reason || reason.trim().length < 3) return;
        act(() => api.post(`/admin/orders/${selected.id}/cancel`, { reason: reason.trim() }), 'Pesanan dibatalkan');
    };

    if (orders.length === 0) {
        return (
            <EmptyState
                icon={mode === 'unpaid' ? 'receipt_long' : 'done_all'}
                title={mode === 'unpaid' ? 'Tidak ada tagihan tertunda' : 'Tidak ada pesanan menunggu diambil'}
                description={mode === 'unpaid' ? 'Pesanan QR yang memilih bayar di kasir akan muncul di sini.' : 'Pesanan ambil di kasir yang sudah siap akan muncul di sini.'}
            />
        );
    }

    const paidAmount = (order) => (order.payments || []).filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

    return (
        <div className="h-full grid grid-cols-[minmax(280px,360px)_1fr] min-h-0">
            <div className="border-r border-hairline overflow-y-auto scroll-thin p-3 space-y-2">
                {orders.map((order) => {
                    const active = selected?.id === order.id;
                    const waited = minutesSince(mode === 'ready' ? order.ready_at : order.created_at, now);
                    return (
                        <button key={order.id} onClick={() => setSelectedId(order.id)}
                            className={`w-full text-left rounded-xl border p-4 transition-colors ${active ? 'border-ink bg-paper' : 'border-hairline bg-paper/60 hover:border-ink/30'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-display text-3xl leading-none tabular">#{order.queue_number}</p>
                                    <p className="font-semibold mt-2 truncate">{order.customer_name || 'Tamu'}</p>
                                    <p className="text-xs text-on-surface-variant">
                                        {CHANNELS[order.channel]} · {order.dining_table?.name || FULFILLMENTS[order.fulfillment]}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold tabular">{formatPrice(order.grand_total)}</p>
                                    <p className={`text-xs mt-1 ${waited >= 10 ? 'text-error font-semibold' : 'text-on-surface-variant'}`}>{waited} mnt</p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {selected && (
                <div className="flex flex-col min-h-0">
                    <div className="flex items-start justify-between gap-4 px-8 pt-8 pb-5 border-b border-hairline">
                        <div>
                            <p className="label-caps mb-1">{selected.order_number}</p>
                            <h2 className="font-display text-4xl">#{selected.queue_number} · {selected.customer_name || 'Tamu'}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <StatusBadge status={selected.status} />
                                <span className="chip border-hairline text-on-surface-variant">{CHANNELS[selected.channel]}</span>
                                <span className="chip border-hairline text-on-surface-variant">{selected.dining_table?.name || FULFILLMENTS[selected.fulfillment]}</span>
                                {selected.customer_phone && <span className="chip border-hairline text-on-surface-variant">{selected.customer_phone}</span>}
                            </div>
                        </div>
                        <p className="font-display text-4xl text-primary tabular">{formatPrice(selected.grand_total)}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto scroll-thin px-8 py-5">
                        {selected.notes && <p className="mb-4 rounded-lg bg-amber-soft px-4 py-3 text-sm text-amber-900">Catatan: {selected.notes}</p>}
                        <div className="divide-y divide-hairline">
                            {selected.items.filter((i) => i.status !== 'voided').map((item) => (
                                <div key={item.id} className="flex items-start justify-between gap-4 py-3">
                                    <div>
                                        <p className="font-medium">{item.quantity}× {item.product_name}</p>
                                        {item.modifiers?.length > 0 && <p className="text-xs text-on-surface-variant">{modifierSummary(item.modifiers)}</p>}
                                        {item.notes && <p className="text-xs italic text-on-surface-variant">{item.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="tabular">{formatPrice(item.line_total)}</span>
                                        {mode === 'unpaid' && paidAmount(selected) === 0 && (
                                            <button onClick={() => voidItem(item)} disabled={busy} className="btn-icon btn-ghost text-error" title="Void item">
                                                <Icon name="remove_shopping_cart" className="text-[18px]" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-hairline px-8 py-5 flex flex-wrap items-center justify-end gap-3 bg-paper">
                        {mode === 'unpaid' ? (
                            <>
                                <button className="btn-danger" onClick={cancel} disabled={busy}><Icon name="cancel" className="text-[18px]" /> Batalkan</button>
                                <button className="btn-primary btn-lg min-w-[240px]" onClick={() => setPaying(true)} disabled={busy}>
                                    <Icon name="payments" /> Terima pembayaran
                                </button>
                            </>
                        ) : (
                            <button className="btn-sage btn-lg min-w-[240px]" disabled={busy}
                                onClick={() => act(() => api.put(`/admin/orders/${selected.id}/status`, { status: 'completed' }), `Pesanan #${selected.queue_number} diserahkan`)}>
                                <Icon name="shopping_bag" /> Sudah diambil
                            </button>
                        )}
                    </div>
                </div>
            )}

            {paying && selected && (
                <PaymentModal
                    title={`Bayar pesanan #${selected.queue_number}`}
                    subtitle={selected.customer_name}
                    total={selected.grand_total}
                    alreadyPaid={paidAmount(selected)}
                    onClose={() => setPaying(false)}
                    onSubmit={async (lines) => {
                        for (const line of lines) {
                            await api.post(`/admin/orders/${selected.id}/payments`, line);
                        }
                        setPaying(false);
                        await onChanged();
                        onPaid(selected, lines);
                    }}
                />
            )}
        </div>
    );
};

export default OrderListPanel;
