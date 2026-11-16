// Utilitas bersama untuk POS & pemesanan (label status, format, hitung total).

export const formatPrice = (value) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value) || 0);

export const ORDER_STATUS = {
    pending_payment: { label: 'Menunggu pembayaran', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    queued: { label: 'Diterima', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    preparing: { label: 'Sedang dibuat', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    ready: { label: 'Siap', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    completed: { label: 'Selesai', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    cancelled: { label: 'Dibatalkan', className: 'bg-red-100 text-red-700 border-red-200' },
};

export const PAYMENT_STATUS = {
    unpaid: 'Belum dibayar',
    paid: 'Lunas',
    partially_refunded: 'Refund sebagian',
    refunded: 'Direfund',
};

export const PAYMENT_METHODS = {
    cash: 'Tunai',
    qris_static: 'QRIS (statis)',
    edc: 'Debit/EDC',
    gateway: 'Online (gateway)',
    legacy: 'Data lama',
};

export const CHANNELS = { pos: 'Kasir', qr: 'QR Meja', online: 'Online' };

export const FULFILLMENTS = { pickup: 'Ambil di kasir', table: 'Antar ke meja' };

export const ROLES = {
    owner: 'Owner',
    manager: 'Manager',
    cashier: 'Kasir',
    barista: 'Barista/Dapur',
    waiter: 'Pelayan',
    customer: 'Pelanggan',
};

export const STAFF_ROLES = ['owner', 'manager', 'cashier', 'barista', 'waiter'];

export const statusLabel = (status) => ORDER_STATUS[status]?.label || status;

export const formatTime = (value) =>
    value ? new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

export const formatDateTime = (value) =>
    value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

/** Tanggal lokal YYYY-MM-DD (bukan UTC) untuk input type="date". */
export const localDateString = (date = new Date()) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export const modifierSummary = (modifiers) =>
    (modifiers || []).map((m) => (m.group ? `${m.group}: ${m.name}` : m.name)).join(' · ');

/** Perkiraan total di sisi klien. Total final selalu dihitung ulang oleh server. */
export const calculateTotals = (subtotal, settings, discountSpec = null) => {
    const s = settings || {};
    const discount = discountAmount(subtotal, discountSpec);
    const base = Math.max(0, subtotal - discount);
    const service = s.service_charge_enabled ? Math.round((base * Number(s.service_charge_rate || 0)) / 100) : 0;
    const taxable = base + service;
    const rate = Number(s.tax_rate ?? 10);
    let tax;
    let total;
    if (s.tax_inclusive) {
        tax = Math.round(taxable - taxable / (1 + rate / 100));
        total = taxable;
    } else {
        tax = Math.round((taxable * rate) / 100);
        total = taxable + tax;
    }
    let rounding = 0;
    const step = Number(s.rounding || 0);
    if (step > 0) {
        const rounded = Math.round(total / step) * step;
        rounding = rounded - total;
        total = rounded;
    }
    return { subtotal, discount, service, tax, rounding, total, taxRate: rate, taxInclusive: !!s.tax_inclusive };
};

/** Nominal diskon dari spesifikasi {type: 'percent'|'amount', value}. */
export const discountAmount = (subtotal, spec) => {
    if (!spec?.type || !spec.value) return 0;
    if (spec.type === 'percent') return Math.round((subtotal * Math.min(100, Number(spec.value))) / 100);
    return Math.min(Number(spec.value), subtotal);
};

export const apiErrorMessage = (err, fallback = 'Terjadi kesalahan. Coba lagi.') => {
    const data = err?.response?.data;
    if (data?.errors) {
        const first = Object.values(data.errors)[0];
        if (Array.isArray(first) && first[0]) return first[0];
    }
    return data?.message || fallback;
};

/** Halaman awal setelah login sesuai peran (PRD bagian 4). */
export const landingPathFor = (user) => {
    if (!user) return '/login';
    if (['owner', 'manager'].includes(user.role)) return '/admin/dashboard';
    if (user.role === 'cashier') return '/pos';
    if (user.role === 'barista') return '/kds';
    if (user.role === 'waiter') return '/antar';
    return '/';
};

/** Harga satu unit item keranjang (harga dasar + pilihan). */
export const unitPriceOf = (item) =>
    Number(item.product?.price || 0) + (item.modifiers || []).reduce((sum, m) => sum + Number(m.price_delta || 0), 0);

/** Simpan pesanan terakhir agar tamu bisa membuka lagi status pesanannya. */
export const rememberOrder = (orderNumber, token) => {
    try {
        const list = JSON.parse(localStorage.getItem('cafe_recent_orders') || '[]').filter((o) => o.orderNumber !== orderNumber);
        list.unshift({ orderNumber, token, at: Date.now() });
        localStorage.setItem('cafe_recent_orders', JSON.stringify(list.slice(0, 10)));
    } catch {
        // abaikan jika penyimpanan diblokir
    }
};

/** Nama perangkat tetap per browser, dipakai untuk token login & shift. */
export const deviceName = () => {
    try {
        let name = localStorage.getItem('cafe_device_name');
        if (!name) {
            name = `perangkat-${Math.random().toString(36).slice(2, 8)}`;
            localStorage.setItem('cafe_device_name', name);
        }
        return name;
    } catch {
        return 'web';
    }
};

export const newIdempotencyKey = () =>
    (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);
