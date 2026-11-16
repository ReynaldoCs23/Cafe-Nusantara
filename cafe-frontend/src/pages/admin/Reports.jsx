import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { EmptyState, Icon, LoadingBlock, PageHeader, StatCard, StatusBadge, useToast } from '../../components/ui';
import { CHANNELS, PAYMENT_METHODS, apiErrorMessage, formatDateTime, formatPrice, localDateString } from '../../utils/pos';
import { ExceptionsTab, HourlyTab, ProductsTab } from './reports/InsightTabs';

const presets = () => {
    const today = new Date();
    const d = (offset) => { const x = new Date(today); x.setDate(x.getDate() + offset); return localDateString(x); };
    return [
        ['today', 'Hari ini', d(0), d(0)],
        ['yesterday', 'Kemarin', d(-1), d(-1)],
        ['7d', '7 hari', d(-6), d(0)],
        ['month', 'Bulan ini', localDateString(new Date(today.getFullYear(), today.getMonth(), 1)), d(0)],
        ['lastmonth', 'Bulan lalu', localDateString(new Date(today.getFullYear(), today.getMonth() - 1, 1)), localDateString(new Date(today.getFullYear(), today.getMonth(), 0))],
    ];
};

const Breakdown = ({ title, rows, empty }) => {
    const max = Math.max(1, ...rows.map((r) => r.amount));
    return (
        <section className="card p-6">
            <h2 className="font-display text-xl mb-5">{title}</h2>
            {rows.length === 0 && <p className="text-sm text-on-surface-variant">{empty}</p>}
            <div className="space-y-4">
                {rows.map((r) => (
                    <div key={r.label}>
                        <div className="flex justify-between text-sm mb-1.5">
                            <span>{r.label} <span className="text-on-surface-variant">· {r.count}</span></span>
                            <span className="tabular font-medium">{formatPrice(r.amount)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-container"><div className="h-full rounded-full bg-primary" style={{ width: `${(r.amount / max) * 100}%` }} /></div>
                    </div>
                ))}
            </div>
        </section>
    );
};

/** Laporan penjualan per periode: pendapatan dari pembayaran lunas dikurangi refund (PRD RPT-01/02/07). */
const Reports = () => {
    const { notify } = useToast();
    const [preset, setPreset] = useState('month');
    const initial = presets().find((p) => p[0] === 'month');
    const [range, setRange] = useState({ start: initial[2], end: initial[3] });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [tab, setTab] = useState('summary');

    const load = useCallback(async (start, end) => {
        setLoading(true);
        try {
            const res = await api.get('/admin/reports', { params: { start_date: start, end_date: end } });
            setData(res.data);
        } catch (err) {
            notify(apiErrorMessage(err, 'Gagal mengambil laporan.'), 'error');
        } finally {
            setLoading(false);
        }
    }, [notify]);

    useEffect(() => {
        load(range.start, range.end);
    }, [load, range]);

    const choosePreset = ([key, , start, end]) => {
        setPreset(key);
        setRange({ start, end });
    };

    const download = async () => {
        setDownloading(true);
        try {
            const res = await api.get('/admin/reports/export', { params: { start_date: range.start, end_date: range.end }, responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `Laporan_Penjualan_${range.start}_sd_${range.end}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            notify('Gagal mengunduh Excel.', 'error');
        } finally {
            setDownloading(false);
        }
    };

    const s = data?.summary;

    return (
        <div className="animate-fade-in">
            <PageHeader eyebrow="Bisnis" title="Laporan Penjualan" description="Pendapatan dihitung dari pembayaran lunas dikurangi refund pada periode terpilih."
                actions={<button className="btn-outline" onClick={download} disabled={downloading}><Icon name="download" className="text-[18px]" /> {downloading ? 'Menyiapkan...' : 'Unduh Excel'}</button>} />

            <div className="flex flex-wrap items-center gap-3 mb-8">
                <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                    {presets().map((p) => (
                        <button key={p[0]} className={preset === p[0] ? 'tab-active' : 'tab'} onClick={() => choosePreset(p)}>{p[1]}</button>
                    ))}
                </div>
                <div className="flex items-center gap-2 ml-auto text-sm">
                    <input type="date" className="input py-2 w-auto" value={range.start} max={range.end} onChange={(e) => { setPreset('custom'); setRange((r) => ({ ...r, start: e.target.value })); }} />
                    <span className="text-on-surface-variant">sampai</span>
                    <input type="date" className="input py-2 w-auto" value={range.end} min={range.start} onChange={(e) => { setPreset('custom'); setRange((r) => ({ ...r, end: e.target.value })); }} />
                </div>
            </div>

            <div className="flex gap-1.5 mb-8 border-b border-hairline">
                {[['summary', 'Ringkasan'], ['products', 'Produk'], ['hourly', 'Jam ramai'], ['exceptions', 'Pembatalan & refund']].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-primary text-ink' : 'border-transparent text-on-surface-variant hover:text-ink'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'products' && <ProductsTab range={range} />}
            {tab === 'hourly' && <HourlyTab range={range} />}
            {tab === 'exceptions' && <ExceptionsTab range={range} />}

            {tab === 'summary' && (!s ? <LoadingBlock label="Menghitung laporan..." /> : (
                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                        <StatCard label="Pendapatan bersih" value={formatPrice(s.net_revenue)} tone="primary" icon="payments" hint={s.refunds_total ? `Setelah refund ${formatPrice(s.refunds_total)}` : 'Tanpa refund'} />
                        <StatCard label="Transaksi lunas" value={s.transaction_count} icon="receipt" hint={`${data.total_orders} pesanan dibuat`} />
                        <StatCard label="Rata-rata transaksi" value={formatPrice(s.average_ticket)} icon="trending_up" />
                        <StatCard label="Pajak terkumpul" value={formatPrice(s.tax_amount)} icon="account_balance" hint={s.service_charge ? `Service ${formatPrice(s.service_charge)}` : undefined} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <section className="card p-6">
                            <h2 className="font-display text-xl mb-5">Rincian</h2>
                            <div className="space-y-2 text-sm">
                                {[
                                    ['Penjualan kotor', s.gross_sales],
                                    ['Diskon', -s.discount_total],
                                    ['Service charge', s.service_charge],
                                    ['Pajak', s.tax_amount],
                                    ['Pembulatan', s.rounding],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex justify-between text-on-surface-variant"><span>{label}</span><span className="tabular">{formatPrice(value)}</span></div>
                                ))}
                                <div className="flex justify-between border-t border-hairline pt-2 mt-2"><span>Total pembayaran</span><span className="tabular">{formatPrice(s.payments_total)}</span></div>
                                <div className="flex justify-between text-error"><span>Refund</span><span className="tabular">−{formatPrice(s.refunds_total)}</span></div>
                                <div className="flex justify-between font-semibold text-ink border-t border-hairline pt-2 mt-2"><span>Pendapatan bersih</span><span className="tabular">{formatPrice(s.net_revenue)}</span></div>
                            </div>
                        </section>
                        <Breakdown title="Metode pembayaran" empty="Belum ada pembayaran." rows={s.by_method.map((m) => ({ label: PAYMENT_METHODS[m.method] || m.method, count: m.count, amount: m.amount }))} />
                        <Breakdown title="Kanal pesanan" empty="Belum ada transaksi." rows={s.by_channel.map((c) => ({ label: CHANNELS[c.channel] || c.channel, count: c.count, amount: c.amount }))} />
                    </div>

                    <section className="card overflow-hidden">
                        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                            <h2 className="font-display text-xl">Rincian pesanan</h2>
                            <span className="text-sm text-on-surface-variant">{data.orders.length} pesanan</span>
                        </div>
                        {data.orders.length === 0 ? <EmptyState icon="receipt_long" title="Tidak ada pesanan pada periode ini" /> : (
                            <div className="max-h-[560px] overflow-y-auto scroll-thin">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-paper">
                                        <tr className="border-y border-hairline text-left">
                                            {['No. pesanan', 'Waktu', 'Pelanggan', 'Kanal', 'Item', 'Total', 'Status'].map((h) => <th key={h} className="label-caps font-semibold px-6 py-3">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-hairline">
                                        {data.orders.map((o) => (
                                            <tr key={o.id} className="hover:bg-surface-container-low/50">
                                                <td className="px-6 py-3.5 font-medium">{o.order_number}</td>
                                                <td className="px-6 py-3.5 text-on-surface-variant whitespace-nowrap">{formatDateTime(o.created_at)}</td>
                                                <td className="px-6 py-3.5">{o.customer_name || 'Tamu'}</td>
                                                <td className="px-6 py-3.5 text-on-surface-variant">{CHANNELS[o.channel]}</td>
                                                <td className="px-6 py-3.5 tabular">{o.items.filter((i) => i.status !== 'voided').reduce((sum, i) => sum + i.quantity, 0)}</td>
                                                <td className="px-6 py-3.5 tabular">{formatPrice(o.grand_total)}</td>
                                                <td className="px-6 py-3.5"><StatusBadge status={o.status} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            ))}
        </div>
    );
};

export default Reports;
