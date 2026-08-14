import React from 'react';

const Locations = () => {
    return (
        <div className="animate-fade-in pb-20">
            {/* Header Area */}
            <div className="w-full bg-surface-container-low/70 py-16 text-center border-b border-outline-variant/30 mb-12">
                <h1 className="font-display-lg text-4xl md:text-5xl text-on-surface font-bold tracking-tight">Lokasi Kami</h1>
                <p className="font-body-lg text-lg text-on-surface-variant mt-4 max-w-2xl mx-auto">Kunjungi kedai kami dan nikmati secangkir kopi segar di tempat yang nyaman.</p>
            </div>

            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    
                    {/* Info Card */}
                    <div className="lg:col-span-1 flex flex-col gap-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div>
                            <h3 className="font-label-caps text-primary tracking-widest mb-4">ALAMAT KEDAI</h3>
                            <h4 className="font-headline-md text-2xl font-bold text-gray-900 mb-2">CafeNusantara Salatiga</h4>
                            <p className="font-body-md text-gray-600 leading-relaxed">
                                Jl. Diponegoro No. 88<br/>
                                Sidorejo, Kota Salatiga<br/>
                                Jawa Tengah 50711
                            </p>
                        </div>

                        <div className="border-t border-gray-100 pt-8">
                            <h3 className="font-label-caps text-primary tracking-widest mb-4">JAM OPERASIONAL</h3>
                            <div className="space-y-3 font-body-md text-gray-600">
                                <div className="flex justify-between border-b border-gray-50 pb-2">
                                    <span>Senin - Kamis</span>
                                    <span className="font-medium text-gray-900">07:00 - 22:00</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-50 pb-2">
                                    <span>Jumat</span>
                                    <span className="font-medium text-gray-900">07:00 - 23:00</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-50 pb-2">
                                    <span>Sabtu - Minggu</span>
                                    <span className="font-medium text-gray-900">06:00 - 23:00</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-8">
                            <h3 className="font-label-caps text-primary tracking-widest mb-4">KONTAK</h3>
                            <div className="space-y-2 font-body-md text-gray-600">
                                <p className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-gray-400">call</span>
                                    +62 811 2345 6789
                                </p>
                                <p className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-gray-400">mail</span>
                                    halo@cafenusantara.id
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Google Maps iframe */}
                    <div className="lg:col-span-2">
                        <div className="w-full h-[500px] rounded-2xl shadow-sm border border-gray-100 overflow-hidden bg-gray-50">
                            <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3955.578668499252!2d110.50534287515124!3d-7.323548992683935!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e7a7833075257a1%3A0x6d11f625946112c2!2sStarbucks%20Salatiga!5e0!3m2!1sen!2sid!4v1689397682522!5m2!1sen!2sid" 
                                width="100%" 
                                height="100%" 
                                style={{ border: 0 }} 
                                allowFullScreen="" 
                                loading="lazy" 
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Google Maps CafeNusantara Salatiga"
                            ></iframe>
                        </div>
                    </div>

                </div>
            </section>
        </div>
    );
};

export default Locations;
