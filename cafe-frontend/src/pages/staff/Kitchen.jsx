import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { EmptyState, Icon, LoadingBlock, Segmented, minutesSince, useNow, useToast } from '../../components/ui';
import { ConnectionDot } from '../../components/staff/StaffShell';
import { useStaffOrders } from '../../hooks/useStaffOrders';
import { CHANNELS, apiErrorMessage, formatTime, modifierSummary } from '../../utils/pos';
import { playChime } from '../../utils/sound';

const STATION_KEY = 'cafe_kds_station';
const readStation = () => {
    try {
        return localStorage.getItem(STATION_KEY) || 'bar';
    } catch {
        return 'bar';
    }
};

const NEXT_STATUS = { queued: 'preparing', preparing: 'ready', ready: 'preparing' };

const ITEM_STYLE = {
    queued: { icon: 'radio_button_unchecked', className: 'text-stone-100' },
    preparing: { icon: 'progress_activity', className: 'text-amber-300' },
    ready: { icon: 'check_circle', className: 'text-emerald-400 line-through decoration-emerald-400/60' },
};

/**
 * Layar bar/dapur (PRD KDS-01..09). Ketuk item: antre -> dibuat -> siap.
 * Tombol "Selesai" menandai semua item stasiun ini siap.
 */
const Kitchen = () => {
    const { notify } = useToast();
    const now = useNow(15000);
    const [station, setStation] = useState(readStation);
    const [data, setData] = useState(null);
    const [busyOrder, setBusyOrder] = useState(null);
    const knownIds = useRef(null);

    const load = useCallback(async () => {
        const res = await api.get('/admin/kds/queue', { params: { station } });
        const incoming = res.data.data;
        const ids = new Set(incoming.orders.map((o) => o.id));
        if (knownIds.current && [...ids].some((id) => !knownIds.current.has(id))) playChime('new');
        knownIds.current = ids;
        setData(incoming);
    }, [station]);

    useEffect(() => {
        knownIds.current = null;
        try {
            localStorage.setItem(STATION_KEY, station);
        } catch {
            // abaikan
        }
        load().catch((err) => notify(apiErrorMessage(err, 'Gagal memuat antrean.'), 'error'));
    }, [load, station, notify]);

    const connection = useStaffOrders(() => load().catch(() => {}), { pollMs: 10000, onPoll: () => load().catch(() => {}) });

    const update = async (order, itemIds, status) => {
        setBusyOrder(order.id);
        try {
            await api.post(`/admin/kds/orders/${order.id}/items`, { item_ids: itemIds, status });
            await load();
        } catch (err) {
            notify(apiErrorMessage(err), 'error');
        } finally {
            setBusyOrder(null);
        }
    };

    if (!data) return <div className="h-full bg-espresso"><LoadingBlock label="Memuat antrean..." /></div>;

    const { orders, recent_ready: recentReady, settings } = data;

    return (
        <div className="h-full flex flex-col bg-espresso">
            <div className="h-14 shrink-0 flex items-center gap-4 px-4 border-b border-espresso-3">
                <Segmented dark value={station} onChange={setStation} options={[
                    ['bar', 'Bar', 'local_cafe'],
                    ['kitchen', 'Dapur', 'skillet'],
                    ['all', 'Semua', 'apps'],
                ]} />
                <span className="text-sm text-stone-400">{orders.length} pesanan dalam antrean</span>
                <div className="ml-auto flex items-center gap-4 text-xs text-stone-400">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> ≥ {settings.warning_minutes} mnt</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> ≥ {settings.critical_minutes} mnt</span>
                    <ConnectionDot state={connection} dark />
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden scroll-thin">
                {orders.length === 0 ? (
                    <EmptyState dark icon="coffee_maker" title="Belum ada pesanan" description="Pesanan yang sudah lunas akan muncul di sini secara otomatis." />
                ) : (
                    <div className="h-full flex gap-4 p-4 items-start">
                        {orders.map((order) => {
                            const age = minutesSince(order.paid_at || order.created_at, now);
                            const tone = age >= settings.critical_minutes ? 'critical' : age >= settings.warning_minutes ? 'warning' : 'normal';
                            const pending = order.items.filter((i) => i.status !== 'ready');
                            return (
                                <article key={order.id} className={`w-[300px] shrink-0 max-h-full flex flex-col rounded-2xl bg-espresso-2 border-2 ${
                                    tone === 'critical' ? 'border-red-500' : tone === 'warning' ? 'border-amber-400' : 'border-espresso-3'
                                } ${busyOrder === order.id ? 'opacity-60' : ''}`}>
                                    <header className={`px-4 py-3 rounded-t-[14px] flex items-start justify-between ${
                                        tone === 'critical' ? 'bg-red-500/15' : tone === 'warning' ? 'bg-amber-400/10' : ''
                                    }`}>
                                        <div>
                                            <p className="font-display text-4xl leading-none text-cream tabular">#{order.queue_number}</p>
                                            <p className="mt-1.5 text-sm font-semibold text-stone-200 truncate max-w-[170px]">{order.customer_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-2xl font-semibold tabular ${tone === 'critical' ? 'text-red-400' : tone === 'warning' ? 'text-amber-300' : 'text-stone-300'}`}>{age}′</p>
                                            <p className="text-[11px] text-stone-400">{formatTime(order.paid_at || order.created_at)}</p>
                                        </div>
                                    </header>
                                    <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                                        <span className={`chip ${order.fulfillment === 'table' ? 'border-sky-400/40 text-sky-300' : 'border-stone-500 text-stone-300'}`}>
                                            <Icon name={order.fulfillment === 'table' ? 'table_restaurant' : 'shopping_bag'} className="text-[14px]" />
                                            {order.dining_table?.name || 'Ambil di kasir'}
                                        </span>
                                        <span className="chip border-stone-600 text-stone-400">{CHANNELS[order.channel]}</span>
                                    </div>
                                    {order.notes && <p className="mx-4 mb-2 rounded-lg bg-amber-400/15 px-3 py-2 text-sm text-amber-200">{order.notes}</p>}

                                    <ul className="flex-1 overflow-y-auto scroll-thin px-2 pb-2">
                                        {order.items.map((item) => {
                                            const style = ITEM_STYLE[item.status] || ITEM_STYLE.queued;
                                            return (
                                                <li key={item.id}>
                                                    <button disabled={busyOrder === order.id}
                                                        onClick={() => update(order, [item.id], NEXT_STATUS[item.status] || 'preparing')}
                                                        className="w-full text-left flex gap-3 rounded-xl px-2.5 py-2.5 hover:bg-espresso-3 transition-colors">
                                                        <Icon name={style.icon} className={`text-[22px] mt-0.5 ${style.className.split(' ')[0]}`} />
                                                        <span className="flex-1 min-w-0">
                                                            <span className={`block text-lg leading-snug font-semibold ${style.className}`}>
                                                                <span className="tabular">{item.quantity}×</span> {item.product_name}
                                                            </span>
                                                            {item.modifiers?.length > 0 && <span className="block text-sm text-stone-400">{modifierSummary(item.modifiers)}</span>}
                                                            {item.notes && <span className="block text-sm text-amber-300 font-medium">“{item.notes}”</span>}
                                                            {station === 'all' && <span className="block text-[11px] uppercase tracking-wider text-stone-500 mt-0.5">{item.station === 'kitchen' ? 'Dapur' : 'Bar'}</span>}
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>

                                    <footer className="p-3 border-t border-espresso-3">
                                        <button disabled={busyOrder === order.id || pending.length === 0}
                                            onClick={() => update(order, pending.map((i) => i.id), 'ready')}
                                            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 flex items-center justify-center gap-2 disabled:opacity-40">
                                            <Icon name="done_all" /> Selesai
                                        </button>
                                    </footer>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            {recentReady.length > 0 && (
                <div className="shrink-0 border-t border-espresso-3 px-4 py-2.5 flex items-center gap-3 overflow-x-auto hide-scrollbar">
                    <span className="text-xs uppercase tracking-wider text-stone-500 whitespace-nowrap">Baru siap</span>
                    {recentReady.map((order) => (
                        <button key={order.id} title="Urungkan: kembalikan ke antrean"
                            onClick={() => window.confirm(`Kembalikan pesanan #${order.queue_number} ke antrean?`) && update(order, order.items.map((i) => i.id), 'preparing')}
                            className="flex items-center gap-2 rounded-full border border-espresso-3 px-3 py-1 text-sm text-stone-300 hover:border-stone-400 whitespace-nowrap">
                            <Icon name="undo" className="text-[16px]" /> #{order.queue_number}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Kitchen;
