// Notifikasi pesanan untuk pelanggan di dalam webapp (pengganti WhatsApp):
// bunyi, getar, notifikasi browser (saat tab di latar belakang), dan judul tab berkedip.
import { playChime } from './sound';

export const notificationSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export const notificationPermission = () => (notificationSupported() ? Notification.permission : 'unsupported');

export const requestNotificationPermission = async () => {
    if (!notificationSupported()) return 'unsupported';
    if (Notification.permission !== 'default') return Notification.permission;
    try {
        return await Notification.requestPermission();
    } catch {
        return 'denied';
    }
};

let titleTimer = null;
const flashTitle = (text) => {
    if (typeof document === 'undefined') return;
    const original = document.title;
    clearInterval(titleTimer);
    let on = false;
    titleTimer = setInterval(() => {
        document.title = on ? original : text;
        on = !on;
    }, 1000);
    const stop = () => {
        clearInterval(titleTimer);
        document.title = original;
        window.removeEventListener('focus', stop);
    };
    window.addEventListener('focus', stop);
    setTimeout(stop, 60000);
};

const READY_TEXT = (order) => (order.fulfillment === 'table'
    ? `Pesanan #${order.queue_number} siap dan segera diantar ke meja Anda.`
    : `Pesanan #${order.queue_number} siap! Silakan ambil di kasir.`);

/** Kabarkan perubahan status penting ke pelanggan. Mengembalikan teks pesan (untuk banner di halaman). */
export const announceOrderStatus = (order, { url } = {}) => {
    let title;
    let body;
    if (order.status === 'ready') {
        title = 'Pesanan siap!';
        body = READY_TEXT(order);
        playChime('ready');
        navigator.vibrate?.([200, 100, 200, 100, 400]);
        flashTitle(`🔔 #${order.queue_number} siap!`);
    } else if (order.status === 'queued') {
        title = 'Pembayaran diterima';
        body = `Pesanan #${order.queue_number} sedang diantrekan untuk dibuat.`;
    } else if (order.status === 'preparing') {
        title = 'Sedang dibuat';
        body = `Barista mulai membuat pesanan #${order.queue_number}.`;
    } else if (order.status === 'cancelled') {
        title = 'Pesanan dibatalkan';
        body = `Pesanan #${order.queue_number} dibatalkan. Hubungi kasir bila ada pertanyaan.`;
    } else {
        return null;
    }

    if (notificationPermission() === 'granted' && (document.hidden || order.status === 'ready')) {
        try {
            const n = new Notification(title, { body, tag: `order-${order.order_number}`, icon: '/favicon.svg' });
            if (url) n.onclick = () => { window.focus(); window.location.href = url; };
        } catch {
            // beberapa browser seluler hanya mengizinkan notifikasi lewat service worker
        }
    }
    return body;
};
