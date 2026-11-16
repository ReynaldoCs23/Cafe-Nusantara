// Sesi "memesan dari meja" setelah pelanggan scan QR (PRD QR-01).
// Disimpan di localStorage agar tetap ada walau pelanggan membuka tab baru,
// dan kedaluwarsa otomatis supaya HP yang sama tidak terkunci ke meja lama.
const KEY = 'cafe_table';
const TTL_MS = 3 * 60 * 60 * 1000; // 3 jam
export const TABLE_EVENT = 'cafe-table-change';

export const readTableSession = () => {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data?.token || Date.now() - (data.at || 0) > TTL_MS) {
            localStorage.removeItem(KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
};

export const saveTableSession = (table, token) => {
    try {
        localStorage.setItem(KEY, JSON.stringify({ token, name: table.name, area: table.area || null, at: Date.now() }));
        window.dispatchEvent(new Event(TABLE_EVENT));
    } catch {
        // penyimpanan diblokir: pemesanan tetap bisa, hanya tanpa meja
    }
};

export const clearTableSession = () => {
    try {
        localStorage.removeItem(KEY);
        window.dispatchEvent(new Event(TABLE_EVENT));
    } catch {
        // abaikan
    }
};

/** Pesanan terakhir yang dibuat dari perangkat ini (disimpan saat checkout). */
export const readRecentOrders = () => {
    try {
        return JSON.parse(localStorage.getItem('cafe_recent_orders') || '[]');
    } catch {
        return [];
    }
};

/** Alamat publik website untuk isi QR. Atur VITE_PUBLIC_URL ke domain asli sebelum mencetak QR. */
export const publicOrigin = () => (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, '');

export const tableUrl = (token) => `${publicOrigin()}/t/${token}`;

export const isLocalOrigin = () => /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(publicOrigin());
