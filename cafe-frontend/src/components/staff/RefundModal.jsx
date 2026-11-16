import { useState } from 'react';
import api from '../../api/axios';
import { Field, Icon, Modal, Segmented } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { PAYMENT_METHODS, apiErrorMessage, formatPrice, modifierSummary } from '../../utils/pos';

/**
 * Refund sebagian per item untuk pesanan yang sudah dibayar (PRD RFD-03).
 * Nominal final dihitung server: harga item disesuaikan proporsional dengan diskon, service, dan pajak.
 */
const RefundModal = ({ order, onClose, onDone }) => {
    const { hasRole } = useAuth();
    const isManager = hasRole('owner', 'manager');
    const items = (order.items || []).filter((i) => i.status !== 'voided' && i.quantity - (i.refunded_quantity || 0) > 0);
    const [qty, setQty] = useState({});
    const [reason, setReason] = useState('');
    const [method, setMethod] = useState('cash');
    const [restock, setRestock] = useState(false);
    const [approver, setApprover] = useState('');
    const [pin, setPin] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const ratio = order.subtotal > 0 ? order.grand_total / order.subtotal : 1;
    const gross = items.reduce((s, i) => s + (qty[i.id] || 0) * (i.unit_price + (i.modifiers_total || 0)), 0);
    const estimate = Math.round(gross * ratio);
    const originalMethod = (order.payments || []).filter((p) => p.status === 'paid').slice(-1)[0]?.method;

    const setLine = (item, value) => {
        const max = item.quantity - (item.refunded_quantity || 0);
        setQty((prev) => ({ ...prev, [item.id]: Math.max(0, Math.min(max, value)) }));
    };

    const submit = async (e) => {
        e.preventDefault();
        const lines = Object.entries(qty).filter(([, q]) => q > 0).map(([id, q]) => ({ order_item_id: Number(id), quantity: q }));
        if (lines.length === 0) return setError('Pilih item dan jumlah yang di-refund.');
        setBusy(true);
        setError('');
        try {
            await api.post(`/admin/orders/${order.id}/refunds`, {
                items: lines,
                reason: reason.trim(),
                method,
                restock,
                ...(isManager ? {} : { approver_username: approver.trim(), approver_pin: pin }),
            });
            onDone();
        } catch (err) {
            setError(apiErrorMessage(err, 'Refund gagal diproses.'));
        } finally {
            setBusy(false);
        }
        return null;
    };

    return (
        <Modal title={`Refund #${order.queue_number}`} subtitle={order.customer_name} onClose={onClose} size="lg"
            footer={
                <>
                    <span className="mr-auto text-sm text-on-surface-variant">Perkiraan refund <strong className="text-ink tabular">{formatPrice(estimate)}</strong></span>
                    <button className="btn-outline" onClick={onClose}>Batal</button>
                    <button form="refund-form" className="btn-danger" disabled={busy || estimate <= 0}>{busy ? 'Memproses...' : 'Proses refund'}</button>
                </>
            }>
            <form id="refund-form" onSubmit={submit} className="space-y-6">
                {items.length === 0 ? <p className="text-sm text-on-surface-variant">Semua item sudah di-refund.</p> : (
                    <ul className="divide-y divide-hairline border-y border-hairline">
                        {items.map((item) => {
                            const max = item.quantity - (item.refunded_quantity || 0);
                            return (
                                <li key={item.id} className="flex items-center gap-4 py-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium">{item.product_name}</p>
                                        <p className="text-xs text-on-surface-variant">
                                            {modifierSummary(item.modifiers)}{item.modifiers?.length ? ' · ' : ''}
                                            {formatPrice(item.unit_price + (item.modifiers_total || 0))}/item · bisa refund {max}
                                        </p>
                                    </div>
                                    <div className="flex items-center rounded-full border border-hairline bg-paper">
                                        <button type="button" className="h-9 w-9 flex items-center justify-center" onClick={() => setLine(item, (qty[item.id] || 0) - 1)} aria-label="Kurangi"><Icon name="remove" className="text-[18px]" /></button>
                                        <span className="w-7 text-center text-sm font-semibold tabular">{qty[item.id] || 0}</span>
                                        <button type="button" className="h-9 w-9 flex items-center justify-center" onClick={() => setLine(item, (qty[item.id] || 0) + 1)} aria-label="Tambah"><Icon name="add" className="text-[18px]" /></button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                        <span className="label-caps block mb-2">Uang dikembalikan lewat</span>
                        <Segmented value={method} onChange={setMethod} options={[
                            ['cash', 'Tunai dari laci'],
                            ['original', `Metode awal${originalMethod ? ` (${PAYMENT_METHODS[originalMethod] || originalMethod})` : ''}`],
                        ]} />
                    </div>
                    <label className="flex items-start gap-3 text-sm pt-6">
                        <input type="checkbox" className="mt-0.5" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
                        <span>Kembalikan ke stok <span className="block text-xs text-on-surface-variant">Centang hanya jika item belum dibuat. Jika tidak, item dicatat sebagai terbuang.</span></span>
                    </label>
                </div>

                <Field label="Alasan refund">
                    <input className="input" required minLength={3} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mis. minuman tumpah, salah pesanan" />
                </Field>

                {!isManager && (
                    <div className="rounded-xl border border-amber-200 bg-amber-soft p-4 space-y-3">
                        <p className="text-sm text-amber-900">Refund membutuhkan persetujuan manager.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <input className="input" required placeholder="Username manager" value={approver} onChange={(e) => setApprover(e.target.value)} autoComplete="off" />
                            <input className="input" required type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="off" />
                        </div>
                    </div>
                )}
                {error && <p className="text-sm text-error" role="alert">{error}</p>}
            </form>
        </Modal>
    );
};

export default RefundModal;
