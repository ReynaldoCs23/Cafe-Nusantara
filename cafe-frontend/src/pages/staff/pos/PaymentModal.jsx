import { useMemo, useState } from 'react';
import { Icon, Modal } from '../../../components/ui';
import { PAYMENT_METHODS, apiErrorMessage, formatPrice } from '../../../utils/pos';

const METHODS = [
    ['cash', 'Tunai', 'payments'],
    ['qris_static', 'QRIS', 'qr_code_2'],
    ['edc', 'Debit/EDC', 'credit_card'],
];

const quickCash = (amount) => {
    const options = [amount];
    [10000, 20000, 50000, 100000].forEach((step) => {
        const rounded = Math.ceil(amount / step) * step;
        if (rounded > amount) options.push(rounded);
    });
    return [...new Set(options)].slice(0, 5);
};

/**
 * Modal pembayaran kasir: tunai (dengan kembalian), QRIS statis, EDC, dan split bayar.
 * onSubmit(lines) -> Promise; lines = [{method, amount, tendered, reference}]
 */
const PaymentModal = ({ title = 'Pembayaran', subtitle, total, alreadyPaid = 0, onSubmit, onClose, extraAction }) => {
    const due = Math.max(0, total - alreadyPaid);
    const [lines, setLines] = useState([]);
    const paidLines = lines.reduce((sum, l) => sum + l.amount, 0);
    const remaining = Math.max(0, due - paidLines);

    const [method, setMethod] = useState('cash');
    const [amount, setAmount] = useState(String(remaining));
    const [tendered, setTendered] = useState(String(remaining));
    const [reference, setReference] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const amountNum = Math.min(Number(amount) || 0, remaining);
    const tenderedNum = Number(tendered) || 0;
    const change = method === 'cash' ? tenderedNum - amountNum : 0;
    const quick = useMemo(() => quickCash(amountNum || remaining), [amountNum, remaining]);

    const currentLine = () => ({
        method,
        amount: amountNum,
        tendered: method === 'cash' ? tenderedNum : null,
        reference: method === 'cash' ? null : reference.trim(),
    });

    const validateCurrent = () => {
        if (amountNum <= 0) return 'Nominal belum diisi.';
        if (method === 'cash' && tenderedNum < amountNum) return 'Uang diterima kurang dari nominal.';
        if (method !== 'cash' && !reference.trim()) return `Isi nomor referensi ${method === 'edc' ? 'struk EDC' : 'transaksi QRIS'}.`;
        return '';
    };

    const resetForm = (nextRemaining) => {
        setAmount(String(nextRemaining));
        setTendered(String(nextRemaining));
        setReference('');
    };

    const addSplit = () => {
        const problem = validateCurrent();
        if (problem) return setError(problem);
        if (amountNum >= remaining) return setError('Untuk split, isi nominal kurang dari sisa tagihan.');
        setError('');
        setLines((prev) => [...prev, currentLine()]);
        resetForm(remaining - amountNum);
    };

    const submit = async () => {
        const problem = remaining > 0 ? validateCurrent() : '';
        if (problem) return setError(problem);
        const all = remaining > 0 ? [...lines, currentLine()] : lines;
        if (all.reduce((s, l) => s + l.amount, 0) < due) return setError('Total pembayaran masih kurang.');
        setBusy(true);
        setError('');
        try {
            await onSubmit(all);
        } catch (err) {
            setError(apiErrorMessage(err, 'Pembayaran gagal diproses.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title={title} subtitle={subtitle} onClose={busy ? undefined : onClose} size="md"
            footer={
                <>
                    {extraAction}
                    <button className="btn-outline" onClick={addSplit} disabled={busy || remaining === 0}>
                        <Icon name="call_split" className="text-[18px]" /> Split
                    </button>
                    <button className="btn-primary min-w-[180px]" onClick={submit} disabled={busy || (method === 'cash' && change < 0 && remaining > 0)}>
                        {busy ? 'Memproses...' : `Terima ${formatPrice(remaining > 0 ? amountNum + paidLines : paidLines)}`}
                    </button>
                </>
            }
        >
            <div className="space-y-5">
                <div className="flex items-end justify-between">
                    <div>
                        <p className="label-caps">Sisa tagihan</p>
                        <p className="font-display text-4xl text-primary tabular">{formatPrice(remaining)}</p>
                    </div>
                    {(alreadyPaid > 0 || lines.length > 0) && (
                        <p className="text-sm text-on-surface-variant text-right">Total {formatPrice(total)}</p>
                    )}
                </div>

                {lines.length > 0 && (
                    <div className="rounded-lg border border-hairline divide-y divide-hairline">
                        {lines.map((l, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                <span>{PAYMENT_METHODS[l.method]}{l.reference ? ` · ${l.reference}` : ''}</span>
                                <span className="flex items-center gap-3">
                                    <span className="tabular font-semibold">{formatPrice(l.amount)}</span>
                                    <button className="text-error" aria-label="Hapus" onClick={() => {
                                        const next = lines.filter((_, idx) => idx !== i);
                                        setLines(next);
                                        resetForm(due - next.reduce((s, x) => s + x.amount, 0));
                                    }}><Icon name="close" className="text-[18px]" /></button>
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {remaining > 0 && (
                    <>
                        <div className="grid grid-cols-3 gap-2">
                            {METHODS.map(([key, label, icon]) => (
                                <button key={key} type="button" onClick={() => setMethod(key)}
                                    className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-sm font-medium transition-colors ${
                                        method === key ? 'border-ink bg-ink text-cream' : 'border-hairline bg-paper hover:border-ink/40'
                                    }`}>
                                    <Icon name={icon} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <label className="block">
                                <span className="label-caps block mb-1.5">Nominal</span>
                                <input className="input-lg tabular" type="number" min="1" max={remaining} value={amount}
                                    onChange={(e) => { setAmount(e.target.value); if (method === 'cash') setTendered(e.target.value); }} />
                            </label>
                            {method === 'cash' ? (
                                <label className="block">
                                    <span className="label-caps block mb-1.5">Uang diterima</span>
                                    <input className="input-lg tabular" type="number" min={amountNum} value={tendered} onChange={(e) => setTendered(e.target.value)} autoFocus />
                                </label>
                            ) : (
                                <label className="block">
                                    <span className="label-caps block mb-1.5">No. referensi</span>
                                    <input className="input-lg" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} autoFocus />
                                </label>
                            )}
                        </div>

                        {method === 'cash' && (
                            <>
                                <div className="flex flex-wrap gap-2">
                                    {quick.map((v) => (
                                        <button key={v} type="button" onClick={() => setTendered(String(v))}
                                            className={`rounded-full border px-4 py-2 text-sm tabular ${tenderedNum === v ? 'border-ink bg-ink text-cream' : 'border-hairline bg-paper hover:border-ink/40'}`}>
                                            {v === amountNum ? 'Uang pas' : formatPrice(v)}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-sage-soft px-5 py-4">
                                    <span className="text-sm font-medium text-sage">Kembalian</span>
                                    <span className={`font-display text-3xl tabular ${change < 0 ? 'text-error' : 'text-sage'}`}>{formatPrice(Math.max(0, change))}</span>
                                </div>
                            </>
                        )}
                    </>
                )}

                {error && <p className="text-sm text-error" role="alert">{error}</p>}
            </div>
        </Modal>
    );
};

export default PaymentModal;
