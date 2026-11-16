import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Icon } from '../ui';
import { formatPrice } from '../../utils/pos';

/** Promo otomatis yang berlaku hari ini, ditampilkan di menu & beranda. */
const PromoStrip = ({ className = '' }) => {
    const [promos, setPromos] = useState([]);

    useEffect(() => {
        api.get('/promotions').then((res) => setPromos(res.data.data || [])).catch(() => setPromos([]));
    }, []);

    if (promos.length === 0) return null;

    return (
        <div className={`flex gap-3 overflow-x-auto hide-scrollbar ${className}`}>
            {promos.map((p) => (
                <div key={p.id} className="shrink-0 min-w-[260px] max-w-sm rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4 flex gap-4">
                    <Icon name="sell" className="text-primary text-[22px] mt-0.5" />
                    <div className="min-w-0">
                        <p className="font-semibold text-ink">{p.name}</p>
                        <p className="text-sm text-primary">{p.summary}{p.min_subtotal ? ` · min. ${formatPrice(p.min_subtotal)}` : ''}</p>
                        <p className="text-xs text-on-surface-variant mt-1">
                            {p.start_time ? `Pukul ${p.start_time}–${p.end_time}` : 'Sepanjang hari'}
                            {p.ends_on ? ` · s/d ${new Date(`${p.ends_on}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : ''}
                            {p.description ? ` · ${p.description}` : ''}
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-1">Otomatis terpasang di keranjang</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PromoStrip;
