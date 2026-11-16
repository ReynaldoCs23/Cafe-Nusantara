import { useEffect, useRef } from 'react';
import { echo } from '../utils/echo';

/**
 * Dengarkan pembaruan status pesanan secara realtime lewat channel rahasia milik pesanan
 * (nama channel memakai token akses). Pemanggil tetap menjalankan polling sebagai cadangan.
 * tokens: daftar token akses pesanan yang ingin dipantau.
 */
export const useOrderTracking = (tokens, onUpdate) => {
    const handler = useRef(onUpdate);
    useEffect(() => {
        handler.current = onUpdate;
    });

    const key = (tokens || []).filter(Boolean).sort().join(',');

    useEffect(() => {
        const list = key ? key.split(',') : [];
        list.forEach((token) => {
            try {
                echo.channel(`order.${token}`).listen('.status', (payload) => handler.current?.(token, payload));
            } catch {
                // realtime tidak tersedia; polling tetap berjalan
            }
        });
        return () => list.forEach((token) => {
            try {
                echo.leave(`order.${token}`);
            } catch {
                // abaikan
            }
        });
    }, [key]);
};
