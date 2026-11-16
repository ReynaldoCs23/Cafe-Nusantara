import { useEffect, useRef, useState } from 'react';
import { echo, STAFF_ORDERS_CHANNEL } from '../utils/echo';

/**
 * Berlangganan perubahan pesanan secara realtime (Reverb) dengan polling cadangan.
 * onChange(event, order) dipanggil setiap ada pesanan baru/berubah.
 * Mengembalikan status koneksi: 'live' | 'polling'.
 */
export const useStaffOrders = (onChange, { pollMs = 10000, onPoll } = {}) => {
    const [connection, setConnection] = useState('polling');
    const changeRef = useRef(onChange);
    const pollRef = useRef(onPoll);

    useEffect(() => {
        changeRef.current = onChange;
        pollRef.current = onPoll;
    });

    useEffect(() => {
        try {
            echo.private(STAFF_ORDERS_CHANNEL)
                .listen('OrderCreated', (e) => changeRef.current?.('created', e.order))
                .listen('OrderStatusUpdated', (e) => changeRef.current?.('updated', e.order));
        } catch {
            // realtime tidak tersedia: polling tetap berjalan
        }

        const pusher = echo.connector?.pusher;
        const updateState = () => setConnection(pusher?.connection?.state === 'connected' ? 'live' : 'polling');
        pusher?.connection?.bind('state_change', updateState);
        updateState();

        // Polling tetap berjalan (lebih jarang saat realtime aktif) agar tidak ada pesanan terlewat
        const timer = setInterval(() => pollRef.current?.(), pollMs);

        return () => {
            clearInterval(timer);
            pusher?.connection?.unbind('state_change', updateState);
            try {
                echo.leave(STAFF_ORDERS_CHANNEL);
            } catch {
                // abaikan
            }
        };
    }, [pollMs]);

    return connection;
};
