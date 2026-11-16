import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useOrderTracking } from '../../hooks/useOrderTracking';
import { announceOrderStatus, notificationPermission, requestNotificationPermission } from '../../utils/customerNotify';
import { readRecentOrders } from '../../utils/table';
import { Icon } from '../ui';

const ACTIVE = ['pending_payment', 'queued', 'preparing', 'ready'];
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const POLL_MS = 20000;

const STATUS_STYLE = {
    pending_payment: ['Bayar di kasir', 'bg-amber-400'],
    queued: ['Diterima', 'bg-sky-400'],
    preparing: ['Sedang dibuat', 'bg-primary-fixed-dim animate-pulse'],
    ready: ['Siap!', 'bg-emerald-400 animate-pulse'],
};

const linkFor = (order) => `/order/${order.order_number}?token=${encodeURIComponent(order.token)}`;

/**
 * Pelacak pesanan aktif di semua halaman publik (pengganti notifikasi WhatsApp).
 * Memantau pesanan dari perangkat ini & akun pelanggan, lalu memberi kabar saat status berubah.
 */
const OrderTracker = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [orders, setOrders] = useState([]); // [{order_number, token, queue_number, status, fulfillment}]
    const [expanded, setExpanded] = useState(false);
    const [banner, setBanner] = useState(null);
    const [permission, setPermission] = useState(notificationPermission());
    const ordersRef = useRef([]);

    const announce = useCallback((order) => {
        const text = announceOrderStatus(order, { url: linkFor(order) });
        if (order.status === 'ready' && text) setBanner({ text, order });
    }, []);

    const sources = useCallback(async () => {
        const local = readRecentOrders()
            .filter((o) => Date.now() - (o.at || 0) < MAX_AGE_MS)
            .map((o) => ({ order_number: o.orderNumber, token: o.token }));
        if (user?.role === 'customer') {
            try {
                const res = await api.get('/my-orders');
                res.data.data
                    .filter((o) => ACTIVE.includes(o.status))
                    .forEach((o) => local.push({ order_number: o.order_number, token: o.access_token }));
            } catch {
                // abaikan: tetap pakai daftar perangkat
            }
        }
        const unique = new Map(local.filter((o) => o.token).map((o) => [o.order_number, o]));
        return [...unique.values()];
    }, [user]);

    const refresh = useCallback(async () => {
        const list = await sources();
        const fetched = await Promise.all(list.map(async (o) => {
            try {
                const res = await api.get(`/orders/${encodeURIComponent(o.order_number)}`, { params: { token: o.token } });
                const d = res.data.data;
                return { order_number: d.order_number, token: o.token, queue_number: d.queue_number, status: d.status, fulfillment: d.fulfillment };
            } catch {
                return null;
            }
        }));
        const next = fetched.filter((o) => o && ACTIVE.includes(o.status));
        // Kabari jika ada perubahan status yang terdeteksi lewat polling (mis. realtime terputus)
        next.forEach((o) => {
            const before = ordersRef.current.find((p) => p.order_number === o.order_number);
            if (before && before.status !== o.status) announce(o);
        });
        ordersRef.current = next;
        setOrders(next);
    }, [sources, announce]);

    useEffect(() => {
        refresh();
        const timer = setInterval(refresh, POLL_MS);
        const onFocus = () => refresh();
        window.addEventListener('focus', onFocus);
        return () => {
            clearInterval(timer);
            window.removeEventListener('focus', onFocus);
        };
    }, [refresh, location.pathname]);

    const tokens = useMemo(() => orders.map((o) => o.token), [orders]);
    useOrderTracking(tokens, (token, payload) => {
        const current = ordersRef.current.find((o) => o.token === token);
        if (!current || current.status === payload.status) return;
        const updated = { ...current, status: payload.status };
        announce(updated);
        const next = ordersRef.current.map((o) => (o.token === token ? updated : o)).filter((o) => ACTIVE.includes(o.status));
        ordersRef.current = next;
        setOrders(next);
    });

    // Halaman status pesanan sudah menampilkan informasi lengkap
    if (location.pathname.startsWith('/order/') || orders.length === 0) {
        return banner ? <ReadyBanner banner={banner} onClose={() => setBanner(null)} /> : null;
    }

    const readyCount = orders.filter((o) => o.status === 'ready').length;

    return (
        <>
            {banner && <ReadyBanner banner={banner} onClose={() => setBanner(null)} />}
            <div className="fixed bottom-5 left-5 z-40 w-[min(calc(100vw-2.5rem),340px)]">
                {expanded && (
                    <div className="card mb-2 p-2 animate-slide-up">
                        <ul className="divide-y divide-hairline">
                            {orders.map((o) => {
                                const [label, dot] = STATUS_STYLE[o.status] || [o.status, 'bg-stone-400'];
                                return (
                                    <li key={o.order_number}>
                                        <Link to={linkFor(o)} className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg hover:bg-surface-container-low">
                                            <span className="font-display text-2xl tabular">#{o.queue_number}</span>
                                            <span className="flex items-center gap-2 text-sm"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                        {permission === 'default' && (
                            <button className="btn-ghost w-full text-xs mt-1" onClick={async () => setPermission(await requestNotificationPermission())}>
                                <Icon name="notifications_active" className="text-[16px]" /> Aktifkan notifikasi saat pesanan siap
                            </button>
                        )}
                    </div>
                )}
                <button onClick={() => setExpanded((v) => !v)}
                    className={`w-full flex items-center justify-between gap-3 rounded-full pl-5 pr-3 py-3 text-sm shadow-[0_8px_30px_rgba(31,28,25,0.18)] transition-colors ${readyCount ? 'bg-emerald-600 text-white' : 'bg-ink text-cream'}`}
                    aria-expanded={expanded}>
                    <span className="flex items-center gap-2.5">
                        <Icon name={readyCount ? 'notifications_active' : 'receipt_long'} className="text-[20px]" />
                        {readyCount ? `${readyCount} pesanan siap!` : `${orders.length} pesanan aktif`}
                    </span>
                    <Icon name={expanded ? 'expand_more' : 'expand_less'} className="text-[20px]" />
                </button>
            </div>
        </>
    );
};

const ReadyBanner = ({ banner, onClose }) => (
    <div className="fixed inset-x-0 top-0 z-[90] p-4 animate-slide-up" role="alert">
        <div className="max-w-xl mx-auto rounded-2xl bg-emerald-600 text-white px-6 py-5 flex items-center gap-4 shadow-[0_12px_40px_rgba(5,80,50,0.35)]">
            <Icon name="notifications_active" className="text-[32px]" />
            <div className="flex-1">
                <p className="font-display text-2xl leading-tight">Pesanan #{banner.order.queue_number} siap!</p>
                <p className="text-sm text-emerald-50">{banner.text}</p>
            </div>
            <Link to={linkFor(banner.order)} onClick={onClose} className="rounded-full bg-white text-emerald-700 px-4 py-2 text-sm font-semibold">Lihat</Link>
            <button onClick={onClose} aria-label="Tutup" className="text-emerald-100 hover:text-white"><Icon name="close" /></button>
        </div>
    </div>
);

export default OrderTracker;
