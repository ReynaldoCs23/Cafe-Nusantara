import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import ContentCard from '../../components/ui/ContentCard';

const About = () => {
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const res = await api.get('/content');
                setContents(res.data?.data || res.data || []);
            } catch (error) {
                console.error("Failed to fetch content", error);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, []);

    if (loading) {
        return <div className="min-h-[50vh] flex items-center justify-center font-label-caps text-on-surface-variant">Loading...</div>;
    }

    return (
        <div className="w-full min-h-screen bg-[#fdfbf7] relative overflow-hidden animate-fade-in pb-20">
            {/* Ambient Blurred Blobs */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#914730]/5 blur-[120px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/4 z-0"></div>
            <div className="absolute top-[40%] right-0 w-[500px] h-[500px] bg-[#8B5A2B]/5 blur-[100px] rounded-full pointer-events-none translate-x-1/3 z-0"></div>
            <div className="absolute bottom-0 left-1/4 w-[800px] h-[400px] bg-[#d6e7a1]/10 blur-[100px] rounded-full pointer-events-none translate-y-1/4 z-0"></div>

            {/* Header Area / Hero Section */}
            <div className="relative w-full h-[60vh] md:h-[80vh] min-h-[500px] flex items-center bg-[#fdfbf7] overflow-hidden">
                {/* Image Layer */}
                <div className="absolute top-0 left-0 w-full md:w-2/3 h-full">
                    <img 
                        src="https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=1200&auto=format&fit=crop" 
                        alt="CafeNusantara Interior" 
                        className="w-full h-full object-cover" 
                    />
                    
                    {/* Gradient Fade Overlay (The Magic Trick) */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#fdfbf7]/80 to-[#fdfbf7]"></div>
                </div>
                
                {/* Content Layer */}
                <div className="container mx-auto px-4 md:px-12 relative z-10 flex justify-end w-full">
                    <div className="w-full md:w-1/2 lg:w-5/12 text-left">
                        <p className="text-sm tracking-widest text-[#8B5A2B] uppercase flex items-center gap-4 font-sans font-semibold">
                            <span className="w-8 h-[1px] bg-[#8B5A2B]"></span>
                            Tentang CafeNusantara
                        </p>
                        <h1 className="text-5xl md:text-7xl font-serif text-gray-900 mt-4 font-bold tracking-tight">
                            Cerita Kami
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 mt-6 max-w-lg leading-relaxed font-sans">
                            Mari berkenalan dengan tim kami mulai dari proses sangrai, lingkungan, dan orang-orang yang bekerja bersama kami!
                        </p>
                    </div>
                </div>
            </div>

            {/* Milestone Section (Perjalanan Kami) */}
            <section className="w-full relative z-10 py-16 overflow-hidden border-b border-[#8B5A2B]/10">
                <div className="max-w-7xl mx-auto px-6 mb-12">
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 tracking-tight">Perjalanan Kami</h2>
                </div>

                {/* Horizontal Scrolling Container */}
                <div className="relative w-full">
                    <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide py-16 px-4 md:px-12 space-x-6 md:space-x-12 items-center max-w-[1440px] mx-auto">
                        {[
                            {
                                year: '2018',
                                title: 'Awal Perjalanan',
                                description: 'Bermula dari sebuah garasi kecil dengan mesin roaster bekas. Kami mulai menyangrai biji kopi lokal pertama kami dengan sepenuh hati.',
                                image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop'
                            },
                            {
                                year: '2020',
                                title: 'Kedai Pertama',
                                description: 'Membuka pintu kedai pertama kami untuk publik. Tempat kecil dimana komunitas penikmat kopi mulai terbentuk dan cerita-cerita baru lahir.',
                                image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=800&auto=format&fit=crop'
                            },
                            {
                                year: '2022',
                                title: 'Ekspansi Roastery',
                                description: 'Membangun fasilitas roastery mandiri untuk menjaga kualitas dan menyuplai lebih banyak kedai lokal di seluruh nusantara.',
                                image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=800&auto=format&fit=crop'
                            },
                            {
                                year: '2024',
                                title: 'Penghargaan Nasional',
                                description: 'Meraih penghargaan sebagai roastery terbaik nasional, memacu kami untuk terus berinovasi dan menyajikan yang terbaik.',
                                image: 'https://images.unsplash.com/photo-1495474472201-447547515082?q=80&w=800&auto=format&fit=crop'
                            }
                        ].map((milestone, index) => (
                            <div 
                                key={index} 
                                className={`bg-white p-3 pb-10 md:p-4 md:pb-12 shadow-xl border border-gray-100 flex-none w-[280px] md:w-[320px] snap-center transform transition-all duration-500 hover:scale-105 hover:rotate-0 hover:z-10 relative group ${index % 2 === 0 ? 'rotate-3' : '-rotate-2'}`}
                            >
                                <img 
                                    src={milestone.image} 
                                    alt={milestone.title}
                                    className="w-full aspect-square object-cover bg-gray-200 border border-gray-100"
                                />
                                
                                <div className="mt-4 text-center space-y-1">
                                    <h4 className="text-[#8B5A2B] font-serif text-xl font-bold">{milestone.year}</h4>
                                    <h3 className="text-gray-900 font-medium text-sm md:text-base">{milestone.title}</h3>
                                    <p className="text-gray-500 text-xs md:text-sm line-clamp-2 mt-2 leading-relaxed">
                                        {milestone.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {/* Empty padding block for the end of scroll */}
                        <div className="snap-center flex-none w-[6vw] md:w-[24px]"></div>
                    </div>
                </div>
            </section>

            {/* Dynamic Sections */}
            <div className="container mx-auto max-w-7xl px-4 md:px-8 py-16 space-y-12 relative z-10">
                {contents.filter(b => b.show_on_about !== false).map((block, index) => (
                    <ContentCard block={block} index={index} key={block.id || index} />
                ))}

                {contents.length === 0 && (
                    <div className="text-center py-20 text-gray-500 font-sans">
                        Kisah kami sedang diracik. Silakan kembali lagi nanti.
                    </div>
                )}
            </div>
        </div>
    );
};

export default About;
