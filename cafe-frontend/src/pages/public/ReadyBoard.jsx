import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { playChime } from '../../utils/sound';

/**
 * Papan antrean untuk TV di area kasir (PRD KDS-07). Hanya nomor antrean, tanpa data pribadi.
 * Buka di browser TV: /antrean (layar penuh dengan F11).
 */
const ReadyBoard = () => {
    const [data, setData] = useState({ preparing: [], ready: [], store_name: '' });
    const [now, setNow] = useState(() => new Date());
    const lastReady = useRef(null);

    useEffect(() => {
        const load = () => api.get('/ready-board').then((res) => {
            const next = res.data.data;
            if (lastReady.current && next.ready.some((n) => !lastReady.current.includes(n))) playChime('ready');
            lastReady.current = next.ready;
            setData(next);
        }).catch(() => {});
        load();
        const poll = setInterval(load, 5000);
        const clock = setInterval(() => setNow(new Date()), 30000);
        return () => {
            clearInterval(poll);
            clearInterval(clock);
        };
    }, []);

    return (
        <div className="min-h-screen bg-espresso text-cream flex flex-col">
            <header className="flex items-center justify-between px-12 py-8 border-b border-espresso-3">
                <p className="font-display text-4xl">{data.store_name || 'Cafe Nusantara'}</p>
                <p className="text-3xl tabular text-stone-300">{now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
            </header>
            <main className="flex-1 grid grid-cols-[2fr_3fr]">
                <section className="px-12 py-10 border-r border-espresso-3">
                    <p className="uppercase tracking-[0.25em] text-stone-400 text-lg mb-8">Sedang dibuat</p>
                    <div className="flex flex-wrap gap-x-10 gap-y-6">
                        {data.preparing.map((n) => <span key={n} className="font-display text-6xl text-stone-300 tabular">{n}</span>)}
                    </div>
                </section>
                <section className="px-12 py-10 bg-espresso-2">
                    <p className="uppercase tracking-[0.25em] text-emerald-400 text-lg mb-8">Silakan ambil</p>
                    <div className="flex flex-wrap gap-x-12 gap-y-8">
                        {data.ready.map((n) => (
                            <span key={n} className="font-display text-8xl text-cream tabular animate-slide-up">{n}</span>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default ReadyBoard;
