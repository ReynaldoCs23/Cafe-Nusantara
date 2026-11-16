// Pembuatan gambar QR & lembar cetak QR meja (PRD TBL-02).
import QRCode from 'qrcode';
import { tableUrl } from './table';

const QR_OPTIONS = { errorCorrectionLevel: 'M', margin: 1, width: 720, color: { dark: '#1f1c19', light: '#ffffff' } };

export const qrDataUrl = (token) => QRCode.toDataURL(tableUrl(token), QR_OPTIONS);

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Lembar A4 berisi kartu QR (2 kolom x 2 baris per halaman), siap dicetak lalu dipasang di stand meja.
 */
export const buildQrSheetHtml = async (tables, storeName) => {
    const cards = await Promise.all(tables.map(async (t) => `
        <section class="card">
            <p class="store">${esc(storeName)}</p>
            <p class="table">${esc(t.name)}</p>
            ${t.area ? `<p class="area">${esc(t.area)}</p>` : ''}
            <img src="${await qrDataUrl(t.qr_token)}" alt="QR ${esc(t.name)}">
            <p class="cta">Scan untuk memesan</p>
            <ol>
                <li>Pilih menu di HP Anda</li>
                <li>Bayar di kasir</li>
                <li>Pesanan diantar ke meja</li>
            </ol>
        </section>`));

    return `<!doctype html><html><head><meta charset="utf-8"><title>QR Meja</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:wght@500;600&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, sans-serif; color: #1f1c19; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
.card { border: 1px solid #d9d2c7; border-radius: 6mm; padding: 9mm 8mm; text-align: center; height: 132mm; break-inside: avoid; display: flex; flex-direction: column; align-items: center; }
.store { font-family: 'Playfair Display', serif; font-size: 13pt; margin: 0; color: #914730; }
.table { font-family: 'Playfair Display', serif; font-size: 30pt; margin: 3mm 0 0; line-height: 1; }
.area { font-size: 9pt; margin: 1.5mm 0 0; color: #6b625a; text-transform: uppercase; letter-spacing: .14em; }
img { width: 56mm; height: 56mm; margin: 6mm 0 4mm; }
.cta { font-size: 11pt; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; margin: 0; }
ol { margin: 3mm 0 0; padding: 0; list-style: none; font-size: 9pt; color: #6b625a; line-height: 1.6; counter-reset: s; }
ol li::before { counter-increment: s; content: counter(s) ". "; }
</style></head><body><div class="grid">${cards.join('')}</div></body></html>`;
};

export const downloadDataUrl = (dataUrl, filename) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
};
