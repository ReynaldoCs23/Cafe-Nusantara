// Cetak struk/laporan ke printer thermal 58/80 mm lewat dialog print browser (PRD PRN-01/02).
import api from '../api/axios';
import { CHANNELS, FULFILLMENTS, PAYMENT_METHODS, modifierSummary } from './pos';

const PAPER_KEY = 'cafe_receipt_paper';

export const getPaperWidth = () => {
    try {
        return localStorage.getItem(PAPER_KEY) || '80';
    } catch {
        return '80';
    }
};

export const setPaperWidth = (width) => {
    try {
        localStorage.setItem(PAPER_KEY, width);
    } catch {
        // abaikan
    }
};

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rp = (value) => `Rp${new Intl.NumberFormat('id-ID').format(Number(value) || 0)}`;
const dt = (value, tz) => (value ? new Date(value).toLocaleString('id-ID', { timeZone: tz || 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' }) : '-');

const shell = (body, width) => `<!doctype html><html><head><meta charset="utf-8"><title>Struk</title>
<style>
@page { size: ${width}mm auto; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; padding: 4mm 3mm; width: ${width}mm; font: ${width === '58' ? '11px' : '12px'}/1.35 'Courier New', ui-monospace, monospace; color: #000; }
.c { text-align: center; } .r { text-align: right; } .b { font-weight: 700; }
.big { font-size: 26px; font-weight: 700; letter-spacing: 1px; }
.name { font-size: 15px; font-weight: 700; }
hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
table { width: 100%; border-collapse: collapse; } td { vertical-align: top; padding: 1px 0; }
.mod { font-size: 0.9em; padding-left: 8px; }
</style></head><body>${body}</body></html>`;

const row = (label, value, cls = '') => `<tr class="${cls}"><td>${esc(label)}</td><td class="r">${esc(value)}</td></tr>`;

export const buildReceiptHtml = ({ store, order }, width = getPaperWidth()) => {
    const tz = store.timezone;
    const items = order.items
        .map((item) => `
        <tr><td colspan="2" class="b">${esc(item.product_name)}</td></tr>
        ${item.modifiers?.length ? `<tr><td colspan="2" class="mod">${esc(modifierSummary(item.modifiers))}</td></tr>` : ''}
        ${item.notes ? `<tr><td colspan="2" class="mod">* ${esc(item.notes)}</td></tr>` : ''}
        <tr><td class="mod">${item.quantity} x ${rp(item.unit_price + (item.modifiers_total || 0))}</td><td class="r">${rp(item.line_total)}</td></tr>`)
        .join('');

    const payments = (order.payments || [])
        .map((p) => row(PAYMENT_METHODS[p.method] || p.method, rp(p.method === 'cash' && p.tendered ? p.tendered : p.amount))
            + (p.change ? row('Kembali', rp(p.change)) : ''))
        .join('');

    const cashier = order.payments?.[0]?.receiver?.name || order.creator?.name || '-';

    return shell(`
        <div class="c name">${esc(store.store_name)}</div>
        ${store.store_address ? `<div class="c">${esc(store.store_address)}</div>` : ''}
        ${store.store_phone ? `<div class="c">${esc(store.store_phone)}</div>` : ''}
        <hr>
        <div class="c">NO. ANTREAN</div>
        <div class="c big">${esc(order.queue_number ?? '-')}</div>
        <div class="c">${esc(FULFILLMENTS[order.fulfillment])}${order.dining_table ? ` · ${esc(order.dining_table.name)}` : ''}</div>
        <hr>
        <table>
            ${row('No', order.order_number)}
            ${row('Waktu', dt(order.paid_at || order.created_at, tz))}
            ${row('Pelanggan', order.customer_name || 'Tamu')}
            ${row('Kasir', cashier)}
            ${row('Kanal', CHANNELS[order.channel] || order.channel)}
        </table>
        <hr>
        <table>${items}</table>
        <hr>
        <table>
            ${row('Subtotal', rp(order.subtotal))}
            ${order.discount_total ? row('Diskon', `-${rp(order.discount_total)}`) : ''}
            ${order.service_charge ? row('Service', rp(order.service_charge)) : ''}
            ${row(`Pajak${store.tax_inclusive ? ' (termasuk)' : ''}`, rp(order.tax_amount))}
            ${order.rounding ? row('Pembulatan', rp(order.rounding)) : ''}
            ${row('TOTAL', rp(order.grand_total), 'b')}
        </table>
        <hr>
        <table>${payments || row('Status', 'BELUM DIBAYAR', 'b')}</table>
        ${order.notes ? `<hr><div>Catatan: ${esc(order.notes)}</div>` : ''}
        <hr>
        <div class="c">${esc(store.receipt_footer || 'Terima kasih')}</div>
    `, width);
};

export const buildShiftReportHtml = (shift, width = getPaperWidth()) => {
    const s = shift.summary || {};
    const tz = shift.store?.timezone;
    const methods = Object.entries(s.by_method || {})
        .map(([method, v]) => row(`${PAYMENT_METHODS[method] || method} (${v.count})`, rp(v.amount)))
        .join('');
    const movements = (s.movements || [])
        .map((m) => row(`${m.type === 'in' ? '+' : '-'} ${m.reason}`, rp(m.amount)))
        .join('');

    return shell(`
        <div class="c name">${esc(shift.store?.store_name || 'Laporan Shift')}</div>
        <div class="c b">LAPORAN TUTUP SHIFT</div>
        <hr>
        <table>
            ${row('Kasir', shift.user?.name)}
            ${row('Buka', dt(shift.opened_at, tz))}
            ${row('Tutup', dt(shift.closed_at, tz))}
            ${row('Transaksi', s.transaction_count ?? 0)}
        </table>
        <hr>
        <div class="b">Penerimaan</div>
        <table>${methods || row('-', rp(0))}${row('Total', rp(s.payments_total), 'b')}</table>
        <hr>
        <div class="b">Kas laci</div>
        <table>
            ${row('Modal awal', rp(s.opening_cash))}
            ${row('Tunai masuk', rp(s.cash_sales))}
            ${row('Kas masuk', rp(s.cash_in))}
            ${row('Kas keluar', `-${rp(s.cash_out)}`)}
            ${row('Refund tunai', `-${rp(s.cash_refunds)}`)}
            ${row('Seharusnya', rp(shift.expected_cash ?? s.expected_cash), 'b')}
            ${shift.counted_cash != null ? row('Dihitung', rp(shift.counted_cash), 'b') : ''}
            ${shift.difference != null ? row('Selisih', rp(shift.difference), 'b') : ''}
        </table>
        ${movements ? `<hr><div class="b">Rincian kas masuk/keluar</div><table>${movements}</table>` : ''}
        ${shift.notes ? `<hr><div>Catatan: ${esc(shift.notes)}</div>` : ''}
        <br><br><div class="c">Tanda tangan kasir / manager</div><br><br>
    `, width);
};

/** Ambil data struk dari server lalu cetak. */
export const printReceipt = async (orderId) => {
    const res = await api.get(`/admin/pos/orders/${orderId}/receipt`);
    printHtml(buildReceiptHtml(res.data.data));
};

/** Cetak HTML lewat iframe tersembunyi agar halaman kasir tidak berpindah. */
export const printHtml = (html, delayMs = 250) => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    frame.onload = null;
    setTimeout(() => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => frame.remove(), 1500);
    }, delayMs);
};
