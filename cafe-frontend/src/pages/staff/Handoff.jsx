import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { EmptyState, Icon, LoadingBlock, Segmented, minutesSince, useNow, useToast } from '../../components/ui';
import { ConnectionDot } from '../../components/staff/StaffShell';
import { useAuth } from '../../context/AuthContext';
import { useStaffOrders } from '../../hooks/useStaffOrders';
import { apiErrorMessage, modifierSummary } from '../../utils/pos';
import { playChime } from '../../utils/sound';

/**
 * Daftar penyerahan pesanan siap (PRD WTR-01/02). Mobile-first untuk HP pelayan.
 * Pelayan melihat pesanan antar ke meja; kasir/barista juga bisa melihat ambil di kasir.
 */
const Handoff = () => {
    const { notify } = useToast();
    const { hasRole } = useAuth();
    const now = useNow(15000);
    const [filter, setFilter] = useState('table');
    const [data, setData] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const known = useRef(null);

    const load = useCallback(async () => {
        const res = await api.get('/admin/handoff', { params: { fulfillment: filter } });
        const ids = new Set(res.data.data.orders.map((o) => o.id));
        if (known.current && [...ids].some((id) => !known.current.has(id))) playChime('ready');
        known.current = ids;
        setData(res.data.data);
    }, [filter]);

    useEffect(() => {
        known.current = null;
        load().catch((err) => notify(apiErrorMessage(err, 'Gagal memuat pesanan siap.'), 'error'));
    }, [load, notify]);

    const connection = useStaffOrders(() => load().catch(() => {}), { pollMs: 10000, onPoll: () => load().catch(() => {}) });

    const complete = async (order) => {
        setBusyId(order.id);
        try {
            await api.put(`/admin/orders/${order.id}/status`, { status: 'completed' });
            notify(`#${order.queue_number} ${order.fulfillment === 'table' ? 'sudah diantar' : 'sudah diambil'}`);
            await load();
        } catch (err) {
            notify(apiErrorMessage(err), 'error');
        } finally {
            setBusyId(null);
        }
    };

    if (!data) return <LoadingBlock label="Memuat pesanan siap..." />;

    return (
        <div className="h-full flex flex-col">
            <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-3 border-b border-hairline">
                {hasRole('owner', 'manager', 'cashier', 'barista') ? (
                    <Segmented value={filter} onChange={setFilter} options={[['table', 'Antar ke meja', 'table_restaurant'], ['pickup', 'Ambil di kasir', 'shopping_bag']]} />
                ) : (
                    <p className="font-display text-xl">Siap diantar</p>
                )}
                <div className="ml-auto"><ConnectionDot state={connection} /></div>
            </div>

            <div className="flex-1 overflow-y-auto scroll-thin p-4">
                {data.orders.length === 0 ? (
                    <EmptyState icon="room_service" title="Semua pesanan sudah diserahkan" description="Pesanan yang siap akan muncul di sini dengan bunyi notifikasi." />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {data.orders.map((order) => {
                            const waited = minutesSince(order.ready_at, now);
                            const overdue = waited >= data.overdue_minutes;
                            return (
                                <article key={order.id} className={`card p-5 flex flex-col animate-slide-up ${overdue ? 'border-error' : ''}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="label-caps">{order.fulfillment === 'table' ? 'Antar ke' : 'Panggil'}</p>
                                            <p className="font-display text-4xl leading-tight">{order.dining_table?.name || `#${order.queue_number}`}</p>
                                            <p className="text-on-surface-variant">{order.customer_name} · #{order.queue_number}</p>
                                        </div>
                                        <span className={`chip ${overdue ? 'border-error/40 text-error bg-error-container/40' : 'border-hairline text-on-surface-variant'}`}>
                                            <Icon name="schedule" className="text-[14px]" /> {waited} mnt
                                        </span>
                                    </div>
                                    <ul className="mt-4 space-y-1.5 text-sm flex-1">
                                        {order.items.map((item) => (
                                            <li key={item.id}>
                                                <span className="font-medium">{item.quantity}× {item.product_name}</span>
                                                {item.modifiers?.length > 0 && <span className="block text-xs text-on-surface-variant">{modifierSummary(item.modifiers)}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                    <button className="btn-sage btn-lg w-full mt-5" disabled={busyId === order.id} onClick={() => complete(order)}>
                                        <Icon name={order.fulfillment === 'table' ? 'room_service' : 'shopping_bag'} />
                                        {order.fulfillment === 'table' ? 'Sudah diantar' : 'Sudah diambil'}
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Handoff;
