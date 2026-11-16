import { useState } from 'react';
import { Field, Modal, Segmented } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { discountAmount, formatPrice } from '../../utils/pos';

/**
 * Diskon manual (PRD PRM-01). Di atas batas persen dari pengaturan toko,
 * kasir harus memasukkan username + PIN manager.
 * onApply({type, value, reason, approver_username?, approver_pin?}) atau onApply(null) untuk hapus diskon.
 */
const DiscountModal = ({ subtotal, current, limitPercent = 10, onApply, onClose, busy = false, error = '' }) => {
    const { hasRole } = useAuth();
    const isManager = hasRole('owner', 'manager');
    const [type, setType] = useState(current?.type || 'percent');
    const [value, setValue] = useState(current?.value ? String(current.value) : '');
    const [reason, setReason] = useState(current?.reason || '');
    const [approver, setApprover] = useState('');
    const [pin, setPin] = useState('');

    const amount = discountAmount(subtotal, { type, value: Number(value) || 0 });
    const percent = subtotal > 0 ? (amount / subtotal) * 100 : 0;
    const needsPin = !isManager && percent > Number(limitPercent);
    const quick = type === 'percent' ? [5, 10, 15, 20, 50] : [5000, 10000, 20000];

    const submit = (e) => {
        e.preventDefault();
        onApply({
            type,
            value: Number(value),
            reason: reason.trim(),
            ...(needsPin ? { approver_username: approver.trim(), approver_pin: pin } : {}),
        });
    };

    return (
        <Modal title="Diskon" subtitle={`Subtotal ${formatPrice(subtotal)}`} onClose={onClose} size="sm"
            footer={
                <>
                    {current && <button type="button" className="btn-ghost text-error mr-auto" onClick={() => onApply(null)} disabled={busy}>Hapus diskon</button>}
                    <button type="button" className="btn-outline" onClick={onClose}>Batal</button>
                    <button form="discount-form" className="btn-primary" disabled={busy || amount <= 0}>{busy ? 'Menyimpan...' : 'Terapkan'}</button>
                </>
            }>
            <form id="discount-form" onSubmit={submit} className="space-y-5">
                <Segmented value={type} onChange={(t) => { setType(t); setValue(''); }} options={[['percent', 'Persen (%)'], ['amount', 'Nominal (Rp)']]} />
                <Field label={type === 'percent' ? 'Diskon (%)' : 'Diskon (Rp)'}>
                    <input className="input-lg tabular" type="number" min="1" max={type === 'percent' ? 100 : subtotal} required value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
                </Field>
                <div className="flex flex-wrap gap-2">
                    {quick.map((q) => (
                        <button type="button" key={q} onClick={() => setValue(String(q))}
                            className={`rounded-full border px-3.5 py-1.5 text-sm tabular ${Number(value) === q ? 'border-ink bg-ink text-cream' : 'border-hairline bg-paper hover:border-ink/40'}`}>
                            {type === 'percent' ? `${q}%` : formatPrice(q)}
                        </button>
                    ))}
                </div>
                <Field label="Alasan">
                    <input className="input" required minLength={3} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mis. pelanggan tetap, komplain, promo" />
                </Field>
                {amount > 0 && (
                    <p className="flex justify-between rounded-xl bg-sage-soft px-4 py-3 text-sm text-sage">
                        <span>Potongan ({percent.toFixed(percent % 1 ? 1 : 0)}%)</span>
                        <span className="font-semibold tabular">−{formatPrice(amount)}</span>
                    </p>
                )}
                {needsPin && (
                    <div className="rounded-xl border border-amber-200 bg-amber-soft p-4 space-y-3">
                        <p className="text-sm text-amber-900">Diskon di atas {limitPercent}% butuh persetujuan manager.</p>
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

export default DiscountModal;
