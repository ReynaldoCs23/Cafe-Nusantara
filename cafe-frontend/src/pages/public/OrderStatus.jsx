import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { Icon, Spinner } from '../../components/ui';
import { FULFILLMENTS, formatPrice, formatTime, modifierSummary } from '../../utils/pos';

const POLL_MS = 10000;

const STEPS = [
    ['pending_payment', 'Bayar di kasir', 'point_of_sale'],
    ['queued', 'Diterima', 'receipt_long'],
    ['preparing', 'Dibuat', 'local_cafe'],
    ['ready', 'Siap', 'notifications_active'],
    ['completed', 'Selesai', 'check'],
];

const HEADLINE = {
    pending_payment: ['Silakan bayar di kasir', 'Sebutkan nomor pesanan Anda kepada kasir.'],
    queued: ['Pesanan diterima', 'Barista kami akan segera membuatnya.'],
    preparing: ['Sedang dibuat', 'Pesanan Anda sedang diracik dengan teliti.'],
    ready: ['Pesanan siap!', ''],
    completed: ['Selamat menikmati', 'Terima kasih telah berkunjung.'],
    cancelled: ['Pesanan dibatalkan', ''],
};

/**
 * Status pesanan pelanggan (wajib token akses). Diperbarui otomatis tiap 10 detik.
 */
const OrderStatus = () => {
    const { orderNumber } = useParams();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const res = await api.get(`/orders/${encodeURIComponent(orderNumber)}`, { params: { token } });
            setOrder(res.data.data);
            setError('');
        } catch (err) {
            setError(err.response?.status === 404 ? 'Pesanan tidak ditemukan atau tautan tidak valid.' : 'Gagal memuat status pesanan.');
        }
    }, [orderNumber, token]);

    useEffect(() => {
        load();
    }, [load]);

    const finished = order && ['completed', 'cancelled'].includes(order.status);
    useEffect(() => {
        if (finished) return undefined;
        const timer = setInterval(load, POLL_MS);
        return () => clearInterval(timer);
    }, [finished, load]);

    if (error) {
        return (
            <div className="max-w-xl mx-auto px-5 py-32 text-center">
                <Icon name="search_off" className="text-6xl text-on-surface-variant/40" />
                <p className="font-display text-3xl mt-6">{error}</p>
                <Link to="/menu" className="btn-primary btn-lg rounded-full px-8 mt-10 inline-flex">Kembali ke menu</Link>
            </div>
        );
    }

    if (!order) return <div className="py-40 flex justify-center text-on-surface-variant"><Spinner /></div>;

    const stepIndex = STEPS.findIndex(([key]) => key === order.status);
    let [title, subtitle] = HEADLINE[order.status] || [order.status_label, ''];
    if (order.status === 'ready') subtitle = order.fulfillment === 'table' ? 'Pesanan segera diantar ke meja Anda.' : 'Silakan ambil di kasir.';
    if (order.status === 'cancelled') subtitle = order.cancel_reason || '';

    return (
        <div className="animate-fade-in max-w-3xl mx-auto px-5 md:px-10 py-16 md:py-24">
            <div className="text-center">
                <p className="label-caps">Nomor antrean</p>
                <p className={`font-display text-[120px] md:text-[160px] leading-none tabular mt-2 ${order.status === 'ready' ? 'text-sage animate-pulse-ring rounded-full' : 'text-primary'}`}>{order.queue_number ?? '–'}</p>
                <h1 className="font-display text-4xl md:text-5xl mt-6">{title}</h1>
                {subtitle && <p className="mt-3 text-lg text-on-surface-variant">{subtitle}</p>}
                <p className="mt-4 text-sm text-on-surface-variant">{order.order_number} · {order.customer_name}{order.dining_table ? ` · ${order.dining_table.name}` : ''}</p>
            </div>

            {order.status === 'pending_payment' && (
                <div className="mt-10 rounded-3xl bg-amber-soft border border-amber-200 px-6 py-5 text-center text-amber-900">
                    <p>Total yang perlu dibayar</p>
                    <p className="font-display text-4xl tabular mt-1">{formatPrice(order.grand_total)}</p>
                    {order.payment_due_at && <p className="text-sm mt-2">Bayar sebelum pukul {formatTime(order.payment_due_at)} agar pesanan tidak batal otomatis.</p>}
                </div>
            )}

            {order.status !== 'cancelled' && (
                <ol className="mt-14 grid grid-cols-5 gap-2">
                    {STEPS.map(([key, label, icon], i) => {
                        const done = i <= stepIndex;
                        return (
                            <li key={key} className="flex flex-col items-center text-center gap-3">
                                <span className={`h-12 w-12 rounded-full flex items-center justify-center border transition-colors ${
                                    i === stepIndex ? 'bg-primary border-primary text-white' : done ? 'bg-ink border-ink text-cream' : 'border-hairline text-on-surface-variant/50'
                                }`}>
                                    <Icon name={icon} className="text-[22px]" />
                                </span>
                                <span className={`text-xs ${done ? 'text-ink font-medium' : 'text-on-surface-variant'}`}>
                                    {key === 'completed' ? (order.fulfillment === 'table' ? 'Diantar' : 'Diambil') : label}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}

            <section className="card mt-14 p-6 md:p-8">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-display text-2xl">Rincian pesanan</h2>
                    <span className="chip border-hairline text-on-surface-variant">{FULFILLMENTS[order.fulfillment]}</span>
                </div>
                <ul className="divide-y divide-hairline">
                    {order.items.filter((i) => i.status !== 'voided').map((item) => (
                        <li key={item.id} className="flex justify-between gap-4 py-3.5 text-sm">
                            <div>
                                <p className="font-medium">{item.quantity}× {item.product_name}</p>
                                {item.modifiers?.length > 0 && <p className="text-xs text-on-surface-variant">{modifierSummary(item.modifiers)}</p>}
                                {item.notes && <p className="text-xs italic text-on-surface-variant">“{item.notes}”</p>}
                            </div>
                            <span className="tabular">{formatPrice(item.line_total)}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex justify-between items-end border-t border-hairline pt-5 mt-2">
                    <span className="label-caps">Total</span>
                    <span className="font-display text-2xl tabular">{formatPrice(order.grand_total)}</span>
                </div>
            </section>

            {!finished && <p className="text-center text-xs text-on-surface-variant mt-6">Halaman ini diperbarui otomatis. Simpan tautan ini untuk memantau pesanan.</p>}
            <div className="text-center mt-10">
                <Link to="/menu" className="text-[12px] font-semibold uppercase tracking-[0.16em] border-b border-primary pb-1 hover:text-primary">Pesan lagi</Link>
            </div>
        </div>
    );
};

export default OrderStatus;
