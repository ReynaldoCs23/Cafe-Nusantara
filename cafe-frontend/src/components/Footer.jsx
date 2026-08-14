import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-[#fdfbf7] relative overflow-hidden border-t border-[#8B5A2B]/10">
            {/* The Watermark */}
            <div className="absolute -bottom-10 -left-10 opacity-5 pointer-events-none transform scale-150">
                <span className="material-symbols-outlined text-[300px] text-[#8B5A2B]">local_cafe</span>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Column 1 (Brand) */}
                    <div>
                        <h2 className="font-serif text-3xl font-bold text-[#8B5A2B] tracking-tight">
                            CafeNusantara
                        </h2>
                    </div>

                    {/* Column 2 (Customer Center) */}
                    <div>
                        <h3 className="font-semibold text-[#8B5A2B] mb-6">
                            Customer Center
                        </h3>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-start gap-3 text-sm text-gray-700">
                                <span className="material-symbols-outlined text-[#8B5A2B] mt-0.5 text-[20px]">location_on</span>
                                <p>Thamrin Plaza, Jl. MH Thamrin No. 10, Jakarta Pusat</p>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                <span className="material-symbols-outlined text-[#8B5A2B] text-[20px]">call</span>
                                <p>0812-1111-8456</p>
                            </div>
                        </div>
                    </div>

                    {/* Column 3 (Consumer Complaints) */}
                    <div>
                        <h3 className="font-semibold text-[#8B5A2B] mb-6">
                            Consumer Complaints Service Contact Information
                        </h3>
                        <p className="text-sm text-gray-700 mb-2 leading-relaxed">
                            Directorate General of Consumer Protection and Trade Compliance, Ministry of Trade of the Republic of Indonesia
                        </p>
                        <p className="text-sm text-gray-700 italic">
                            WhatsApp Ditjen PKTN: 0853-1111-1010
                        </p>
                    </div>
                </div>

            </div>

            {/* Bottom Bar */}
            <div className="max-w-7xl mx-auto px-4 relative z-10 border-t border-[#8B5A2B]/20 py-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500">
                        © 2026 CafeNusantara. All rights reserved &bull; Terms and Conditions &bull; Privacy Policy
                    </p>
                    
                    <div className="flex items-center gap-6">
                        {/* YouTube */}
                        <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-gray-500 hover:text-[#8B5A2B] transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                            </svg>
                        </a>
                        {/* X / Twitter */}
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="X" className="text-gray-500 hover:text-[#8B5A2B] transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.007 4.15H5.059z" />
                            </svg>
                        </a>
                        {/* Instagram */}
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-gray-500 hover:text-[#8B5A2B] transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                            </svg>
                        </a>
                        {/* LinkedIn */}
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-gray-500 hover:text-[#8B5A2B] transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                                <rect x="2" y="9" width="4" height="12"></rect>
                                <circle cx="4" cy="4" r="2"></circle>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
