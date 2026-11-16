import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { EmptyState, Icon, LoadingBlock, PageHeader, useToast } from '../../components/ui';
import { apiErrorMessage, formatDateTime, formatPrice } from '../../utils/pos';
import { buildShiftReportHtml, printHtml } from '../../utils/print';

/** Riwayat shift kasir dan selisih kas (PRD SFT-03/04). */
const ShiftHistory = () => {
    const { notify } = useToast();
    const [shifts, setShifts] = useState(null);

    useEffect(() => {
        api.get('/admin/shifts')
            .then((res) => setShifts(res.data.data))
            .catch((err) => notify(apiErrorMessage(err, 'Gagal memuat riwayat shift.'), 'error'));
    }, [notify]);

    const reprint = async (shift) => {
        try {
            const res = await api.get(`/admin/shifts/${shift.id}`);
            printHtml(buildShiftReportHtml(res.data.data));
        } catch (err) {
            notify(apiErrorMessage(err), 'error');
        }
    };

    if (!shifts) return <LoadingBlock />;

    return (
        <div className="animate-fade-in">
            <PageHeader eyebrow="Bisnis" title="Riwayat Shift" description="Pantau modal, penerimaan, dan selisih kas setiap kasir." />

            <div className="card overflow-hidden">
                {shifts.length === 0 ? (
                    <EmptyState icon="account_balance_wallet" title="Belum ada shift" description="Shift dibuka kasir dari layar Kasir." />
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-hairline text-left">
                                {['Kasir', 'Dibuka', 'Ditutup', 'Penerimaan', 'Kas seharusnya', 'Dihitung', 'Selisih', ''].map((h) => (
                                    <th key={h} className="label-caps font-semibold px-5 py-4">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {shifts.map((s) => (
                                <tr key={s.id} className="hover:bg-surface-container-low/60">
                                    <td className="px-5 py-4 font-medium">{s.user?.name}</td>
                                    <td className="px-5 py-4 text-on-surface-variant">{formatDateTime(s.opened_at)}</td>
                                    <td className="px-5 py-4 text-on-surface-variant">
                                        {s.closed_at ? formatDateTime(s.closed_at) : <span className="chip border-emerald-300 text-emerald-700 bg-emerald-50">Masih buka</span>}
                                    </td>
                                    <td className="px-5 py-4 tabular">{s.summary ? formatPrice(s.summary.payments_total) : '—'}</td>
                                    <td className="px-5 py-4 tabular">{s.expected_cash != null ? formatPrice(s.expected_cash) : '—'}</td>
                                    <td className="px-5 py-4 tabular">{s.counted_cash != null ? formatPrice(s.counted_cash) : '—'}</td>
                                    <td className={`px-5 py-4 tabular font-semibold ${s.difference ? 'text-error' : s.difference === 0 ? 'text-sage' : ''}`}>
                                        {s.difference != null ? `${s.difference > 0 ? '+' : ''}${formatPrice(s.difference)}` : '—'}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        {s.closed_at && <button className="btn-ghost text-xs" onClick={() => reprint(s)}><Icon name="print" className="text-[16px]" /> Cetak</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ShiftHistory;
