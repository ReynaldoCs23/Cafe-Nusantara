import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { EmptyState, Icon, LoadingBlock, StatCard, useToast } from '../../../components/ui';
import { PAYMENT_METHODS, apiErrorMessage, formatDateTime, formatPrice } from '../../../utils/pos';

const useInsight = (endpoint, range) => {
    const { notify } = useToast();
    const [data, setData] = useState(null);
    useEffect(() => {
        let active = true;
        setData(null);
        api.get(endpoint, { params: { start_date: range.start, end_date: range.end } })
            .then((res) => active && setData(res.data.data))
            .catch((err) => notify(apiErrorMessage(err, 'Gagal memuat laporan.'), 'error'));
        return () => { active = false; };
    }, [endpoint, range.start, range.end, notify]);
    return data;
};

const Bar = ({ value, max, tone = 'bg-primary' }) => (
    <div className="h-1.5 rounded-full bg-surface-container"><div className={`h-full rounded-full ${tone}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div>
);

/** Produk & kategori terlaris (PRD RPT-03). */
export const ProductsTab = ({ range }) => {
    const data = useInsight('/admin/reports/products', range);
    const [sort, setSort] = useState('quantity');
    if (!data) return <LoadingBlock />;
    if (data.products.length === 0) return <div className="card"><EmptyState icon="restaurant_menu" title="Belum ada penjualan pada periode ini" /></div>;

    const products = [...data.products].sort((a, b) => b[sort] - a[sort]);
    const max = Math.max(...products.map((p) => p[sort]));
    const maxCat = Math.max(...data.categories.map((c) => c.revenue));

    return (
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
            <section className="card overflow-hidden">
                <div className="px-6 pt-6 pb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-xl">Produk terlaris</h2>
                    <div className="flex gap-1.5">
                        <button className={sort === 'quantity' ? 'tab-active' : 'tab'} onClick={() => setSort('quantity')}>Terbanyak</button>
                        <button className={sort === 'revenue' ? 'tab-active' : 'tab'} onClick={() => setSort('revenue')}>Pendapatan</button>
                    </div>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-y border-hairline text-left">
                            {['#', 'Produk', 'Terjual', 'Penjualan', ''].map((h) => <th key={h} className="label-caps font-semibold px-6 py-3">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                        {products.map((p, i) => (
                            <tr key={`${p.name}-${p.category}`}>
                                <td className="px-6 py-3 text-on-surface-variant tabular w-10">{i + 1}</td>
                                <td className="px-6 py-3">
                                    <p className="font-medium">{p.name}</p>
                                    <p className="text-xs text-on-surface-variant">{p.category}</p>
                                </td>
                                <td className="px-6 py-3 tabular">{p.quantity}</td>
                                <td className="px-6 py-3 tabular">{formatPrice(p.revenue)}</td>
                                <td className="px-6 py-3 w-40"><Bar value={p[sort]} max={max} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="px-6 py-4 text-xs text-on-surface-variant border-t border-hairline">Penjualan item sebelum pajak & service, sudah dikurangi item yang di-refund.</p>
            </section>

            <section className="card p-6">
                <h2 className="font-display text-xl mb-5">Per kategori</h2>
                <div className="space-y-4">
                    {data.categories.map((c) => (
                        <div key={c.name}>
                            <div className="flex justify-between text-sm mb-1.5">
                                <span>{c.name} <span className="text-on-surface-variant">· {c.quantity}</span></span>
                                <span className="tabular font-medium">{formatPrice(c.revenue)}</span>
                            </div>
                            <Bar value={c.revenue} max={maxCat} tone="bg-sage" />
                        </div>
                    ))}
                </div>
                <div className="border-t border-hairline mt-6 pt-4 flex justify-between text-sm font-semibold">
                    <span>{data.total_quantity} item</span><span className="tabular">{formatPrice(data.total_revenue)}</span>
                </div>
            </section>
        </div>
    );
};

/** Penjualan per jam & hari untuk mengatur jumlah staf (PRD RPT-04). */
export const HourlyTab = ({ range }) => {
    const data = useInsight('/admin/reports/hourly', range);
    const [metric, setMetric] = useState('count');
    if (!data) return <LoadingBlock />;

    const hours = data.hours.filter((h) => h.count > 0 || (h.hour >= 6 && h.hour <= 23));
    const max = Math.max(1, ...hours.map((h) => h[metric]));
    const maxDay = Math.max(1, ...data.weekdays.map((d) => d.count));
    const total = data.hours.reduce((s, h) => s + h.count, 0);

    if (total === 0) return <div className="card"><EmptyState icon="schedule" title="Belum ada transaksi pada periode ini" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
                <StatCard label="Jam tersibuk" value={`${String(data.peak_hour).padStart(2, '0')}:00`} icon="local_fire_department" tone="primary" hint="Berdasarkan jumlah transaksi" />
                <StatCard label="Transaksi" value={total} icon="receipt" hint={`${data.days} hari`} />
                <StatCard label="Rata-rata per hari" value={(total / data.days).toFixed(1)} icon="calendar_today" />
            </div>

            <section className="card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
                    <h2 className="font-display text-xl">Per jam</h2>
                    <div className="flex gap-1.5">
                        <button className={metric === 'count' ? 'tab-active' : 'tab'} onClick={() => setMetric('count')}>Transaksi</button>
                        <button className={metric === 'amount' ? 'tab-active' : 'tab'} onClick={() => setMetric('amount')}>Pendapatan</button>
                    </div>
                </div>
                <div className="flex items-end gap-1.5 h-56" role="img" aria-label="Grafik transaksi per jam">
                    {hours.map((h) => (
                        <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full group">
                            <span className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 tabular mb-1 whitespace-nowrap">
                                {metric === 'count' ? h.count : formatPrice(h.amount)}
                            </span>
                            <div className={`w-full rounded-t-md ${h.hour === data.peak_hour ? 'bg-primary' : 'bg-primary/35'} transition-all`}
                                style={{ height: `${Math.max(h[metric] > 0 ? 3 : 0, (h[metric] / max) * 100)}%` }} />
                            <span className="text-[10px] text-on-surface-variant mt-2 tabular">{String(h.hour).padStart(2, '0')}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="card p-6">
                <h2 className="font-display text-xl mb-5">Per hari</h2>
                <div className="grid grid-cols-7 gap-3">
                    {data.weekdays.map((d) => (
                        <div key={d.day} className="text-center">
                            <div className="h-28 flex items-end justify-center">
                                <div className="w-full max-w-[44px] rounded-t-md bg-sage/70" style={{ height: `${(d.count / maxDay) * 100}%` }} />
                            </div>
                            <p className="text-xs mt-2">{d.day}</p>
                            <p className="text-xs text-on-surface-variant tabular">{d.count}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

const Section = ({ title, count, children }) => (
    <section className="card overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <h2 className="font-display text-xl">{title}</h2>
            <span className="text-sm text-on-surface-variant">{count}</span>
        </div>
        {count === 0 ? <p className="px-6 pb-6 text-sm text-on-surface-variant">Tidak ada.</p> : <div className="border-t border-hairline">{children}</div>}
    </section>
);

/** Pembatalan, refund, void, dan buat ulang beserta alasan & pelaku (PRD RPT-05, RFD-04). */
export const ExceptionsTab = ({ range }) => {
    const data = useInsight('/admin/reports/exceptions', range);
    if (!data) return <LoadingBlock />;
    const s = data.summary;

    return (
        <div className="space-y-6">
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="Pembatalan" value={s.cancellations} icon="cancel" hint={s.cancelled_paid_value ? `${formatPrice(s.cancelled_paid_value)} sudah dibayar` : 'Semua belum dibayar'} />
                <StatCard label="Refund" value={formatPrice(s.refunds_value)} icon="currency_exchange" hint={`${s.refunds} transaksi`} tone={s.refunds ? 'warning' : 'default'} />
                <StatCard label="Void & buat ulang" value={s.voids + s.remakes} icon="replay" hint={`${s.voids} void · ${s.remakes} buat ulang`} />
                <StatCard label="Perkiraan terbuang" value={formatPrice(s.waste_value)} icon="delete_sweep" hint={`${s.waste_items} item sudah dibuat lalu batal/refund`} tone={s.waste_items ? 'warning' : 'default'} />
            </div>

            <Section title="Refund" count={data.refunds.length}>
                <ul className="divide-y divide-hairline text-sm">
                    {data.refunds.map((r, i) => (
                        <li key={i} className="px-6 py-4 flex flex-wrap justify-between gap-4">
                            <div>
                                <p className="font-medium">#{r.queue_number} · {r.order_number}</p>
                                <p className="text-on-surface-variant">{(r.items || []).map((it) => `${it.quantity}× ${it.product_name}`).join(', ') || 'Seluruh pesanan'} — “{r.reason}”</p>
                                <p className="text-xs text-on-surface-variant mt-1">{formatDateTime(r.at)} · {r.by}{r.approved_by && r.approved_by !== r.by ? ` · disetujui ${r.approved_by}` : ''} · {PAYMENT_METHODS[r.method] || r.method}{r.restocked ? ' · stok dikembalikan' : ''}</p>
                            </div>
                            <span className="tabular font-semibold text-error">−{formatPrice(r.amount)}</span>
                        </li>
                    ))}
                </ul>
            </Section>

            <Section title="Pembatalan pesanan" count={data.cancellations.length}>
                <ul className="divide-y divide-hairline text-sm">
                    {data.cancellations.map((c) => (
                        <li key={c.order_id} className="px-6 py-4 flex flex-wrap justify-between gap-4">
                            <div>
                                <p className="font-medium">#{c.queue_number} · {c.customer_name || 'Tamu'}</p>
                                <p className="text-on-surface-variant">“{c.reason}”</p>
                                <p className="text-xs text-on-surface-variant mt-1">{formatDateTime(c.at)} · {c.by}</p>
                            </div>
                            <span className={`chip self-start ${c.was_paid ? 'border-error/30 text-error' : 'border-hairline text-on-surface-variant'}`}>
                                {c.was_paid ? `Sudah dibayar · ${formatPrice(c.amount)}` : 'Belum dibayar'}
                            </span>
                        </li>
                    ))}
                </ul>
            </Section>

            <div className="grid lg:grid-cols-2 gap-6">
                <Section title="Void item" count={data.voids.length}>
                    <ul className="divide-y divide-hairline text-sm">
                        {data.voids.map((v, i) => (
                            <li key={i} className="px-6 py-3.5">
                                <p className="font-medium">{v.quantity}× {v.product_name} <span className="text-on-surface-variant font-normal">· #{v.queue_number}</span></p>
                                <p className="text-xs text-on-surface-variant">“{v.reason}” · {v.by} · {formatDateTime(v.at)}{v.already_made ? ' · sudah dibuat' : ''}</p>
                            </li>
                        ))}
                    </ul>
                </Section>
                <Section title="Buat ulang" count={data.remakes.length}>
                    <ul className="divide-y divide-hairline text-sm">
                        {data.remakes.map((r, i) => (
                            <li key={i} className="px-6 py-3.5">
                                <p className="font-medium">#{r.queue_number}</p>
                                <p className="text-xs text-on-surface-variant">“{r.reason || '-'}” · {r.by} · {formatDateTime(r.at)}</p>
                            </li>
                        ))}
                    </ul>
                </Section>
            </div>

            <p className="flex items-start gap-2 text-xs text-on-surface-variant">
                <Icon name="info" className="text-[16px]" />
                Perkiraan terbuang dihitung dari item yang sudah mulai dibuat lalu di-void/batal, serta item refund yang tidak dikembalikan ke stok (nilai harga jual).
            </p>
        </div>
    );
};
