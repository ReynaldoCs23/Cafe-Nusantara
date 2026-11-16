import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import ContentCard from '../../components/ui/ContentCard';
import PageIntro from '../../components/public/PageIntro';
import { Icon, Spinner } from '../../components/ui';

// Perjalanan kedai. Ubah teks dan foto di sini sesuai cerita asli cafe.
const MILESTONES = [
    { year: '2018', title: 'Awal perjalanan', description: 'Bermula dari garasi kecil dengan mesin roaster bekas, kami menyangrai biji kopi lokal pertama dengan sepenuh hati.', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop' },
    { year: '2020', title: 'Kedai pertama', description: 'Pintu kedai pertama dibuka untuk publik — tempat komunitas penikmat kopi mulai terbentuk.', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=800&auto=format&fit=crop' },
    { year: '2022', title: 'Roastery sendiri', description: 'Membangun fasilitas sangrai mandiri untuk menjaga kualitas dan menyuplai kedai-kedai lokal.', image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=800&auto=format&fit=crop' },
    { year: '2024', title: 'Terus bertumbuh', description: 'Penghargaan dan kepercayaan pelanggan memacu kami untuk terus berinovasi.', image: 'https://images.unsplash.com/photo-1495474472201-447547515082?q=80&w=800&auto=format&fit=crop' },
];

/** Cerita cafe: perjalanan kedai dan bagian konten yang diatur dari back-office. */
const About = () => {
    const [blocks, setBlocks] = useState(null);

    useEffect(() => {
        api.get('/content')
            .then((res) => setBlocks((res.data?.data || []).filter((b) => b.is_active !== false)))
            .catch(() => setBlocks([]));
    }, []);

    return (
        <div className="animate-fade-in">
            <PageIntro eyebrow="Cerita kami" title="Secangkir kopi, sebuah cerita panjang."
                description="Dari proses sangrai hingga cangkir di meja Anda — kenali orang-orang dan nilai di balik Cafe Nusantara." />

            <section className="border-y border-hairline bg-paper">
                <div className="max-w-7xl mx-auto px-5 md:px-10 py-20 md:py-28">
                    <p className="label-caps text-primary mb-12 flex items-center gap-4"><span className="h-px w-8 bg-primary/60" />Perjalanan</p>
                    <ol className="grid gap-12 md:gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {MILESTONES.map((m) => (
                            <li key={m.year}>
                                <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-surface-container">
                                    <img src={m.image} alt={m.title} loading="lazy" className="h-full w-full object-cover" />
                                </div>
                                <p className="font-display text-5xl text-primary mt-6 tabular">{m.year}</p>
                                <p className="font-display text-xl mt-2">{m.title}</p>
                                <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{m.description}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-5 md:px-10 py-24 md:py-32">
                {!blocks ? (
                    <div className="flex justify-center text-on-surface-variant"><Spinner /></div>
                ) : blocks.length === 0 ? (
                    <p className="text-center text-on-surface-variant">Kisah kami sedang diracik. Silakan kembali lagi nanti.</p>
                ) : (
                    <div className="space-y-24 md:space-y-32">
                        {blocks.map((block, index) => <ContentCard key={block.id || index} block={block} index={index} />)}
                    </div>
                )}
            </div>

            <section className="border-t border-hairline">
                <div className="max-w-7xl mx-auto px-5 md:px-10 py-20 text-center">
                    <p className="font-display text-4xl md:text-5xl max-w-2xl mx-auto leading-tight">Mampirlah, kopi pertama selalu yang paling berkesan.</p>
                    <div className="mt-10 flex flex-wrap justify-center gap-3">
                        <Link to="/menu" className="btn-primary btn-lg rounded-full px-8">Lihat menu</Link>
                        <Link to="/locations" className="btn-secondary btn-lg rounded-full px-8">Kunjungi kami <Icon name="arrow_forward" /></Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
