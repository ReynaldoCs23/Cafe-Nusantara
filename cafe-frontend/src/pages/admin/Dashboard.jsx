import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { EmptyState, Icon, LoadingBlock, PageHeader, StatCard, StatusBadge, useToast } from '../../components/ui';
import { useStaffOrders } from '../../hooks/useStaffOrders';
import { useAuth } from '../../context/AuthContext';
import { CHANNELS, PAYMENT_METHODS, apiErrorMessage, formatPrice, formatTime } from '../../utils/pos';

const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 19) return 'Selamat sore';
    return 'Selamat malam';
};

/** Ringkasan hari ini untuk owner/manager. */
const Dashboard = () => {
    const { user } = useAuth();
    const { notify } = useToast();
    const [data, setData] = useState(null);

    const load = useCallback(async () => {
        const res = await api.get('/admin/dashboard-metrics');
        setData(res.data.data);
    }, []);

    useEffect(() => {
        load().catch((err) => notify(apiErrorMessage(err, 'Gagal memuat ringkasan.'), 'error'));
    }, [load, notify]);

    useStaffOrders(() => load().catch(() => {}), { pollMs: 30000, onPoll: () => load().catch(() => {}) });

    if (!data) return <LoadingBlock label="Memuat ringkasan..." />;

    const s = data.summary;
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const maxMethod = Math.max(1, ...s.by_method.map((m) => m.amount));

    return (
        <div className="animate-fade-in">
            <PageHeader eyebrow={today} title={`${greeting()}, ${user?.name?.split(' ')[0] || ''}.`}
                description="Ringkasan penjualan dan pesanan hari ini. Angka diperbarui otomatis."
                actions={
                    <>
                        <Link to="/pos" className="btn-primary"><Icon name="point_of_sale" className="text-[18px]" /> Buka kasir</Link>
                        <Link to="/admin/reports" className="btn-outline"><Icon name="monitoring" className="text-[18px]" /> Laporan</Link>
                    </>
                } />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <StatCard label="Pendapatan bersih" value={formatPrice(data.today_revenue)} hint="Pembayaran lunas dikurangi refund" icon="payments" tone="primary" />
                <StatCard label="Transaksi lunas" value={s.transaction_count} hint={`Rata-rata ${formatPrice(s.average_ticket)} per transaksi`} icon="receipt" />
                <StatCard label="Sedang diproses" value={data.active_orders} hint="Diterima, dibuat, atau siap diserahkan" icon="local_cafe" tone="sage" />
                <StatCard label="Menunggu bayar" value={data.awaiting_payment} hint="Pesanan QR/online & bayar nanti" icon="hourglass_top" tone={data.awaiting_payment > 0 ? 'warning' : 'default'} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
                <section className="card">
                    <div className="flex items-center justify-between px-6 pt-6 pb-4">
                        <h2 className="font-display text-xl">Pesanan terbaru</h2>
                        <Link to="/admin/orders" className="text-sm text-primary font-medium hover:underline underline-offset-4">Lihat semua</Link>
                    </div>
                    {data.recent_orders.length === 0 ? (
                        <EmptyState icon="receipt_long" title="Belum ada pesanan hari ini" />
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-y border-hairline text-left">
                                    {['Antrean', 'Pelanggan', 'Kanal', 'Waktu', 'Total', 'Status'].map((h) => <th key={h} className="label-caps font-semibold px-6 py-3">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline">
                                {data.recent_orders.map((o) => (
                                    <tr key={o.id}>
                                        <td className="px-6 py-4 font-display text-lg tabular">#{o.queue_number}</td>
                                        <td className="px-6 py-4">{o.customer_name || 'Tamu'}</td>
                                        <td className="px-6 py-4 text-on-surface-variant">{CHANNELS[o.channel]}</td>
                                        <td className="px-6 py-4 text-on-surface-variant tabular">{formatTime(o.created_at)}</td>
                                        <td className="px-6 py-4 tabular">{formatPrice(o.grand_total)}</td>
                                        <td className="px-6 py-4"><StatusBadge status={o.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>

                <div className="space-y-6">
                    <section className="card p-6">
                        <h2 className="font-display text-xl mb-5">Metode pembayaran</h2>
                        {s.by_method.length === 0 && <p className="text-sm text-on-surface-variant">Belum ada pembayaran hari ini.</p>}
                        <div className="space-y-4">
                            {s.by_method.map((m) => (
                                <div key={m.method}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span>{PAYMENT_METHODS[m.method] || m.method} <span className="text-on-surface-variant">· {m.count}</span></span>
                                        <span className="tabular font-medium">{formatPrice(m.amount)}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-surface-container">
                                        <div className="h-full rounded-full bg-primary" style={{ width: `${(m.amount / maxMethod) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="card p-6">
                        <h2 className="font-display text-xl mb-4">Kanal pesanan</h2>
                        {s.by_channel.length === 0 && <p className="text-sm text-on-surface-variant">Belum ada transaksi.</p>}
                        <div className="divide-y divide-hairline text-sm">
                            {s.by_channel.map((c) => (
                                <div key={c.channel} className="flex justify-between py-2.5">
                                    <span>{CHANNELS[c.channel] || c.channel} <span className="text-on-surface-variant">· {c.count}</span></span>
                                    <span className="tabular">{formatPrice(c.amount)}</span>
                                </div>
                            ))}
                        </div>
                        {s.refunds_total > 0 && (
                            <p className="mt-4 text-xs text-error">Refund hari ini {formatPrice(s.refunds_total)}</p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
