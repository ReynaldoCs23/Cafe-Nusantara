import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import api from '../../api/axios';
import { useCart } from '../../context/CartContext';
import ProductCard from '../../components/ProductCard';
import ContentCard from '../../components/ui/ContentCard';
import PromoStrip from '../../components/public/PromoStrip';
import { Icon, Spinner } from '../../components/ui';
import { getImageUrl } from '../../utils/imageHelper';
import { useStoreSettings } from '../../hooks/useStoreSettings';

const SectionTitle = ({ eyebrow, title, action }) => (
    <div className="flex flex-wrap items-end justify-between gap-6 mb-12 md:mb-16">
        <div>
            <p className="label-caps text-primary mb-4 flex items-center gap-4"><span className="h-px w-8 bg-primary/60" />{eyebrow}</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.1] tracking-[-0.01em] text-ink">{title}</h2>
        </div>
        {action}
    </div>
);

const STEPS = [
    ['qr_code_scanner', 'Pesan dari meja', 'Scan QR di meja, pilih menu, lalu pesanan diantar ke tempat Anda.'],
    ['storefront', 'Pesan di kasir', 'Sampaikan pesanan Anda ke barista kami, ambil saat nomor Anda dipanggil.'],
    ['shopping_bag', 'Pesan online', 'Pesan dari mana saja, lalu ambil di kasir tanpa perlu menunggu.'],
];

const Home = () => {
    const { addToCart } = useCart();
    const settings = useStoreSettings();
    const [data, setData] = useState(null);

    useEffect(() => {
        Promise.all([api.get('/content'), api.get('/products'), api.get('/galleries'), api.get('/hero-slides?active=true')])
            .then(([contentRes, productsRes, galleryRes, heroRes]) => {
                const products = productsRes.data?.data || [];
                const recommended = products.filter((p) => p.is_recommended && !p.is_sold_out);
                const filler = products.filter((p) => !p.is_recommended && !p.is_sold_out);
                setData({
                    slides: heroRes.data?.data || [],
                    blocks: (contentRes.data?.data || []).filter((b) => b.is_active && (b.show_on_home === 1 || b.show_on_home === true)),
                    gallery: galleryRes.data?.data || [],
                    products: [...recommended, ...filler].slice(0, 3),
                });
            })
            .catch(() => setData({ slides: [], blocks: [], gallery: [], products: [] }));
    }, []);

    if (!data) {
        return <div className="min-h-[70vh] flex items-center justify-center text-on-surface-variant"><Spinner /></div>;
    }

    const isOpen = settings?.is_open;

    return (
        <div className="animate-fade-in">
            {/* Hero */}
            <section className="relative h-[calc(100vh-5rem)] min-h-[560px] max-h-[900px] bg-espresso">
                {data.slides.length > 0 ? (
                    <Swiper modules={[Autoplay, Pagination, EffectFade]} effect="fade" speed={1400} loop={data.slides.length > 1}
                        autoplay={{ delay: 6000, disableOnInteraction: false }}
                        pagination={{ clickable: true, bulletClass: 'swiper-custom-bullet', bulletActiveClass: 'swiper-custom-bullet-active' }}
                        className="h-full w-full">
                        {data.slides.map((slide) => (
                            <SwiperSlide key={slide.id}>
                                <div className="relative h-full w-full">
                                    <img src={getImageUrl(slide.image_path)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-espresso/80 via-espresso/40 to-transparent" />
                                    <div className="relative h-full max-w-7xl mx-auto px-5 md:px-10 flex flex-col justify-center">
                                        <p className="label-caps text-stone-300 mb-6 flex items-center gap-4"><span className="h-px w-10 bg-stone-300" />Hadir menemani hari</p>
                                        <h1 className="font-display text-cream text-5xl md:text-7xl leading-[1.04] tracking-[-0.02em] max-w-3xl">{slide.title}</h1>
                                        {slide.subtitle && <p className="mt-6 text-lg text-stone-200 max-w-xl leading-relaxed whitespace-pre-line">{slide.subtitle}</p>}
                                        <div className="mt-10 flex flex-wrap gap-3">
                                            <Link to="/menu" className="btn-primary btn-lg rounded-full px-8">{slide.button_text || 'Pesan sekarang'}</Link>
                                            <Link to="/about" className="btn btn-lg rounded-full px-8 border border-cream/60 text-cream hover:bg-cream hover:text-ink">Cerita kami</Link>
                                        </div>
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                ) : (
                    <div className="relative h-full max-w-7xl mx-auto px-5 md:px-10 flex flex-col justify-center">
                        <h1 className="font-display text-cream text-5xl md:text-7xl leading-[1.04] max-w-3xl">Menyeduh ketenangan, satu cangkir setiap kali.</h1>
                        <div className="mt-10"><Link to="/menu" className="btn-primary btn-lg rounded-full px-8">Lihat menu</Link></div>
                    </div>
                )}

                {settings && (
                    <div className="absolute bottom-8 right-5 md:right-10 z-10 hidden sm:flex items-center gap-3 rounded-full bg-cream/95 px-5 py-3 text-sm">
                        <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-sage' : 'bg-error'}`} />
                        <span className="font-medium">{isOpen ? 'Sedang buka' : 'Sedang tutup'}</span>
                        <Link to="/locations" className="text-on-surface-variant hover:text-ink">· Jam buka</Link>
                    </div>
                )}
            </section>

            {/* Cara memesan */}
            <section className="border-b border-hairline">
                <div className="max-w-7xl mx-auto px-5 md:px-10 grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-hairline">
                    {STEPS.map(([icon, title, text]) => (
                        <div key={title} className="py-10 md:px-10 first:md:pl-0 last:md:pr-0 flex gap-5">
                            <Icon name={icon} className="text-[28px] text-primary" />
                            <div>
                                <p className="font-display text-xl text-ink">{title}</p>
                                <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">{text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-5 md:px-10 pt-12">
                <PromoStrip />
            </div>

            {/* Rekomendasi */}
            {data.products.length > 0 && (
                <section className="max-w-7xl mx-auto px-5 md:px-10 py-24 md:py-32">
                    <SectionTitle eyebrow="Pilihan barista" title="Rekomendasi minggu ini"
                        action={<Link to="/menu" className="text-[12px] font-semibold uppercase tracking-[0.16em] border-b border-primary pb-1 hover:text-primary">Lihat semua menu</Link>} />
                    <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                        {data.products.map((product) => <ProductCard key={product.id} product={product} onAddToCart={addToCart} />)}
                    </div>
                </section>
            )}

            {/* Cerita */}
            {data.blocks.length > 0 && (
                <div className="bg-paper border-y border-hairline">
                    <div className="max-w-7xl mx-auto px-5 md:px-10 py-24 md:py-32 space-y-24 md:space-y-32">
                        {data.blocks.map((block, index) => <ContentCard key={block.id || index} block={block} index={index} />)}
                    </div>
                </div>
            )}

            {/* Galeri */}
            {data.gallery.length > 0 && (
                <section className="max-w-7xl mx-auto px-5 md:px-10 py-24 md:py-32">
                    <SectionTitle eyebrow="#CeritaNusantara" title="Momen di kedai kami"
                        action={<a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold uppercase tracking-[0.16em] border-b border-primary pb-1 hover:text-primary">Ikuti di Instagram</a>} />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        {data.gallery.slice(0, 8).map((item, i) => (
                            <div key={item.id} className={`overflow-hidden rounded-2xl bg-surface-container ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                                <img src={getImageUrl(item.image_path)} alt="" loading="lazy" className="h-full w-full aspect-square object-cover transition-transform duration-[1200ms] hover:scale-[1.04]" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Ajakan */}
            <section className="bg-espresso text-cream">
                <div className="max-w-7xl mx-auto px-5 md:px-10 py-20 md:py-24 flex flex-wrap items-center justify-between gap-8">
                    <div>
                        <p className="label-caps text-stone-400 mb-4">Siap memesan?</p>
                        <p className="font-display text-4xl md:text-5xl leading-tight max-w-2xl">Pesan sekarang, ambil di kasir tanpa antre.</p>
                    </div>
                    <Link to="/menu" className="btn btn-lg rounded-full px-8 bg-cream text-ink hover:bg-primary hover:text-white">
                        Lihat menu <Icon name="arrow_forward" />
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Home;
