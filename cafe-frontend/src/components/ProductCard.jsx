import React from 'react';

const ProductCard = ({ product, onClick, onAddToCart }) => {
    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
    };

    return (
        <div 
            className="group cursor-pointer flex flex-col h-full bg-white/80 backdrop-blur-md border border-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl p-4" 
            onClick={onClick ? () => onClick(product) : undefined}
        >
            <div className="aspect-[4/5] md:aspect-[3/4] bg-[#f4f4f0] relative overflow-hidden rounded-xl mb-6">
                {/* Floating Badge */}
                <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-md text-gray-800 font-sans font-semibold text-[10px] tracking-widest px-3 py-1.5 rounded-full uppercase">
                    {product.category?.name || 'Single Origin'}
                </div>
                
                <img 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" 
                    src={product.image_url || "https://via.placeholder.com/600x800?text=No+Image"} 
                    alt={product.name} 
                />
            </div>
            
            <div className="flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-serif text-xl md:text-2xl text-gray-900 group-hover:text-[#914730] transition-colors line-clamp-1 pr-4">
                        {product.name}
                    </h3>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onAddToCart) onAddToCart(product, 1);
                        }}
                        className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-[#914730] hover:text-white hover:border-[#914730] transition-all duration-300"
                        title="Add to cart"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                </div>
                
                <p className="text-gray-500 text-sm font-sans mb-3 line-clamp-1">
                    {product.description || 'Notes of berries, dark chocolate, and floral'}
                </p>
                
                <div className="mt-auto">
                    <p className="text-[#914730] font-sans font-semibold tracking-wide">
                        {formatPrice(product.price)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
