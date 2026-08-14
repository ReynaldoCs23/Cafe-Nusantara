import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useCart } from '../../context/CartContext';
import ProductCard from '../../components/ProductCard';
import ContentCard from '../../components/ui/ContentCard';
import { getImageUrl } from '../../utils/imageHelper';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

const Home = () => {
    const [contentBlocks, setContentBlocks] = useState([]);
    const [recommendedProducts, setRecommendedProducts] = useState([]);
    const [gallery, setGallery] = useState([]);
    const [heroSlides, setHeroSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                // Fetch both dynamic content and products simultaneously for faster loading
                const [contentRes, productsRes, galleryRes, heroRes] = await Promise.all([
                    api.get('/content'),
                    api.get('/products'),
                    api.get('/galleries'),
                    api.get('/hero-slides?active=true')
                ]);

                const rawBlocks = contentRes.data?.data || contentRes.data || [];
                setHeroSlides(heroRes.data?.data || []);
                setContentBlocks(rawBlocks.filter(item => item.show_on_home === 1 || item.show_on_home === true));
                
                setGallery(galleryRes.data?.data || []);
                
                // Filter recommended products locally
                const allProducts = productsRes.data?.data || [];
                const recommended = allProducts.filter(p => p.is_recommended).slice(0, 3);
                
                if (recommended.length < 3) {
                    const others = allProducts.filter(p => !p.is_recommended && p.is_active).slice(0, 3 - recommended.length);
                    setRecommendedProducts([...recommended, ...others]);
                } else {
                    setRecommendedProducts(recommended);
                }
            } catch (error) {
                console.error("Failed to fetch home data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHomeData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
    };

    return (
        <div className="main-page-wrapper relative w-full animate-fade-in pb-24 bg-[#fdfbf7] bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.02)_10px,rgba(0,0,0,0.02)_11px)] overflow-hidden">
            {/* Ambient Blurred Blobs */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#914730]/5 blur-[120px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/4 z-0"></div>
            <div className="absolute top-[40%] right-0 w-[500px] h-[500px] bg-[#8B5A2B]/5 blur-[100px] rounded-full pointer-events-none translate-x-1/3 z-0"></div>
            <div className="absolute bottom-0 left-1/4 w-[800px] h-[400px] bg-[#d6e7a1]/10 blur-[100px] rounded-full pointer-events-none translate-y-1/4 z-0"></div>
            
            <div className="relative z-10 w-full">
                {/* 1. TOP: HERO SECTION (Index 0) */}
            <section id="hero" className="relative w-full h-[80vh] md:min-h-[600px]">
                {heroSlides.length > 0 ? (
                    <Swiper
                        modules={[Autoplay, Pagination, EffectFade]}
                        effect="fade"
                        speed={1500}
                        autoplay={{ delay: 5000, disableOnInteraction: false }}
                        pagination={{ 
                            clickable: true, 
                            bulletClass: 'swiper-custom-bullet', 
                            bulletActiveClass: 'swiper-custom-bullet-active' 
                        }}
                        className="w-full h-full"
                    >
                        {heroSlides.map((slide) => (
                            <SwiperSlide key={slide.id}>
                                <div className="w-full h-full relative flex items-center">
                                    <div 
                                        className="absolute inset-0 w-full h-full bg-cover bg-center"
                                        style={{ backgroundImage: `url(${getImageUrl(slide.image_path)})` }}
                                    >
                                        <div className="absolute inset-0 bg-black/40"></div>
                                    </div>
                                    
                                    <div className="relative z-10 w-full px-6 lg:px-12 flex flex-col items-start justify-center text-left max-w-7xl mx-auto">
                                        <p className="text-sm tracking-widest text-gray-200 uppercase mb-4 flex items-center gap-4 font-sans">
                                            <span className="w-8 h-[1px] bg-gray-200"></span> HADIR UNTUK MENEMANI HARI
                                        </p>
                                        <h1 className="text-white text-5xl md:text-6xl font-serif leading-tight max-w-3xl mb-6">
                                            {slide.title}
                                        </h1>
                                        <div className="text-gray-100 text-lg font-sans max-w-2xl mb-10 leading-relaxed whitespace-pre-line">
                                            {slide.subtitle}
                                        </div>

                                        <div className="flex flex-row gap-4 items-center">
                                            <Link to="/menu" className="bg-[#C06C53] text-white font-sans text-xs tracking-[0.1em] font-semibold uppercase px-8 py-4 rounded hover:bg-[#a65d47] transition-all duration-300">
                                                {slide.button_text || 'Pesan Sekarang'}
                                            </Link>
                                            <Link to="/menu" className="border border-white text-white backdrop-blur-sm bg-white/10 font-sans text-xs tracking-[0.1em] font-semibold uppercase px-8 py-4 rounded hover:bg-white/20 transition-all duration-300">
                                                Lihat Menu
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                ) : (
                    <div className="w-full h-full relative flex items-center bg-gray-900">
                        <div className="absolute inset-0 bg-black/40"></div>
                        <div className="relative z-10 w-full px-6 lg:px-12 flex flex-col items-start justify-center text-left max-w-7xl mx-auto">
                            <h1 className="text-white text-5xl md:text-6xl font-serif leading-tight">Selamat Datang</h1>
                        </div>
                    </div>
                )}
            </section>

            {/* REST OF THE CONTENT - WRAPPED IN CONTAINER */}
            <div className="container mx-auto px-4 md:px-8 max-w-[1440px]">
                {/* 2. MIDDLE: RECOMMENDED MENU */}
            <section className="px-6 lg:px-12 max-w-[1440px] mx-auto py-24">
                <div className="flex justify-between items-end border-b border-gray-200 pb-4 mb-12">
                    <h2 className="text-3xl md:text-4xl font-serif text-gray-900">
                        Rekomendasi Menu
                    </h2>
                    <Link to="/menu" className="text-sm font-sans tracking-widest text-gray-500 uppercase hover:text-gray-900 transition-colors duration-300">
                        Lihat Semua
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-12">
                    {recommendedProducts.map(product => (
                        <div key={product.id} className="h-full">
                            <ProductCard 
                                product={product} 
                                onAddToCart={addToCart}
                            />
                        </div>
                    ))}
                </div>
            </section>


            {/* 3. BOTTOM: OTHER DYNAMIC BLOCKS (Alternating Layout) */}
            <div className="container mx-auto px-4 py-16 space-y-24">
                {contentBlocks.filter(b => b.is_active && b.show_on_home).map((block, index) => (
                    <ContentCard block={block} index={index} key={block.id || index} />
                ))}
            </div>

            {/* 4. BOTTOM: #CeritaNusantara GALLERY */}
            <section className="py-20 mt-16 px-4">
                <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-6 md:p-12 border border-white/50 shadow-sm max-w-6xl mx-auto">
                    <div className="mb-12">
                        <h2 className="text-3xl font-serif text-center font-semibold mb-2 text-gray-900">
                            #CeritaNusantara
                        </h2>
                        <p className="text-center text-gray-500 text-sm tracking-wide">
                            Ikuti perjalanan kopi kami di Instagram
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1 rounded-2xl overflow-hidden">
                        {gallery.map(item => (
                            <div key={item.id} className="aspect-square overflow-hidden group">
                                <img 
                                    src={getImageUrl(item.image_path)} 
                                    alt="Cerita Nusantara" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                                />
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="inline-block border border-gray-400 text-gray-700 px-8 py-3 uppercase text-sm font-sans tracking-widest hover:bg-gray-900 hover:text-white transition-colors duration-300">
                            LIHAT LEBIH BANYAK
                        </a>
                    </div>
                </div>
            </section>
            </div>
            </div>
        </div>
    );
};

export default Home;
