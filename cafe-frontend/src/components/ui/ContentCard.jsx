import React, { useState } from 'react';
import { getImageUrl } from '../../utils/imageHelper';

const ContentCard = ({ block, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Alternate layout based on index (even = text left, image right / odd = image left, text right)
    const isEven = index % 2 === 0;

    return (
        <div className="bg-white/80 backdrop-blur-md p-8 md:p-12 rounded-[2rem] shadow-sm border border-white/60 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                {/* Text Block */}
                <div className={`flex flex-col ${isEven ? 'order-2 md:order-1' : 'order-2 md:order-2 md:pl-12'}`}>
                    {block.section_name && (
                        <span className="text-sm font-bold text-[#8B5A2B] uppercase tracking-widest mb-2">{block.section_name}</span>
                    )}
                    {block.title && (
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-amber-900 mb-6 leading-tight whitespace-pre-line">
                            {block.title}
                        </h2>
                    )}
                    {block.body && (
                        <div className="flex flex-col items-start">
                            <p className={`text-base md:text-lg text-gray-700 font-sans leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-4'}`}>
                                {block.body}
                            </p>
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)} 
                                className="text-[#8B5A2B] font-semibold text-sm mt-4 hover:underline uppercase tracking-wider transition-colors"
                            >
                                {isExpanded ? 'Tutup' : 'Baca Selengkapnya'}
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Image Block */}
                <div className={`w-full ${isEven ? 'order-1 md:order-2' : 'order-1 md:order-1'}`}>
                    {(block.image_url || block.image_path) ? (
                        <img 
                            alt={block.title || `Content block ${index + 1}`} 
                            className="w-full h-[400px] object-cover rounded-xl shadow-md" 
                            src={getImageUrl(block.image_url || block.image_path)} 
                        />
                    ) : (
                        <div className="w-full h-[400px] bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                            <span className="material-symbols-outlined text-4xl text-gray-400">image</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentCard;
