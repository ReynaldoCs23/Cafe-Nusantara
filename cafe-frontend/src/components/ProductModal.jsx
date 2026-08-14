import React, { useState } from 'react';

const ProductModal = ({ product, isOpen, onClose, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const [iceLevel, setIceLevel] = useState('Normal');
    const [sugarLevel, setSugarLevel] = useState('Normal');
    const [spicyLevel, setSpicyLevel] = useState('Sedang');
    const [size, setSize] = useState('Regular');

    if (!isOpen || !product) return null;

    const categoryName = product?.category?.name || '';
    const isFood = categoryName.toLowerCase() === 'makanan';
    const isDrink = categoryName.toLowerCase() === 'kopi' || categoryName.toLowerCase() === 'non-kopi';

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
    };

    const handleAddToCart = () => {
        let customizations = null;
        if (isDrink) {
            customizations = {
                size: size,
                ice: iceLevel,
                sugar: sugarLevel
            };
        }
        if (isDrink) {
            customizations.ice = iceLevel;
            customizations.sugar = sugarLevel;
        }
        onAddToCart(product, quantity, customizations);
    };

    const currentPrice = product.price + (isDrink && size === 'Large' ? 5000 : 0);

    return (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 transition-opacity duration-300">
            <div className="absolute inset-0 cursor-pointer" onClick={onClose}></div>
            
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row shadow-2xl animate-fade-in rounded-2xl">
                <button 
                    className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-900 transition-colors bg-white/50 backdrop-blur-sm rounded-full p-2" 
                    onClick={onClose}
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* Image Section */}
                <div className="w-full md:w-1/2 p-4 md:p-8 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50">
                    <div className="aspect-square w-full overflow-hidden rounded-xl shadow-sm">
                        <img 
                            className="w-full h-full object-cover" 
                            src={product.image_url || "https://via.placeholder.com/600x600?text=No+Image"} 
                            alt={product.name} 
                        />
                    </div>
                </div>

                {/* Content Section */}
                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col">
                    {product.category && (
                        <span className="text-gray-500 font-semibold text-xs tracking-widest uppercase mb-2">{product.category.name}</span>
                    )}
                    <h2 className="font-display-lg text-3xl text-gray-900 font-bold mb-2 leading-tight">{product.name}</h2>
                    <p className="text-primary text-2xl font-bold mb-6">{formatPrice(currentPrice)}</p>
                    
                    <div className="prose text-gray-600 mb-8 leading-relaxed text-sm">
                        <p>{product.description}</p>
                    </div>

                    {/* Customizations */}
                    {isDrink && (
                        <div className="flex flex-col gap-6 mb-8 flex-grow">
                            {/* Size */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Ukuran</h4>
                                <div className="flex gap-4">
                                    {['Regular', 'Large'].map((opt) => (
                                        <label key={opt} className={`cursor-pointer flex-1 py-3 px-4 text-center rounded-xl border ${size === opt ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} transition-all`}>
                                            <input type="radio" className="hidden" name="size" value={opt} checked={size === opt} onChange={() => setSize(opt)} />
                                            {opt} {opt === 'Large' && <span className="block text-xs font-normal opacity-70">(+ Rp 5.000)</span>}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Ice Level */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Es</h4>
                                <div className="flex gap-3">
                                    {['Normal', 'Less Ice', 'No Ice'].map((opt) => (
                                        <label key={opt} className={`cursor-pointer py-2 px-4 rounded-full border text-sm ${iceLevel === opt ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} transition-all`}>
                                            <input type="radio" className="hidden" name="ice" value={opt} checked={iceLevel === opt} onChange={() => setIceLevel(opt)} />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Sugar Level */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Gula</h4>
                                <div className="flex gap-3">
                                    {['Normal', 'Less Sugar', 'No Sugar'].map((opt) => (
                                        <label key={opt} className={`cursor-pointer py-2 px-4 rounded-full border text-sm ${sugarLevel === opt ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} transition-all`}>
                                            <input type="radio" className="hidden" name="sugar" value={opt} checked={sugarLevel === opt} onChange={() => setSugarLevel(opt)} />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {!isDrink && (
                        <div className="flex-grow"></div>
                    )}
                    
                    <div className="border-t border-gray-100 pt-6 flex items-center gap-4">
                        {/* Quantity Selector */}
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden h-14 bg-gray-50">
                            <button 
                                className="px-4 h-full flex items-center justify-center hover:bg-gray-200 text-gray-600 transition-colors"
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            >
                                <span className="material-symbols-outlined text-[20px]">remove</span>
                            </button>
                            <div className="w-12 text-center font-semibold text-gray-900">{quantity}</div>
                            <button 
                                className="px-4 h-full flex items-center justify-center hover:bg-gray-200 text-gray-600 transition-colors"
                                onClick={() => setQuantity(q => q + 1)}
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                            </button>
                        </div>
                        
                        {/* Add to Cart Button */}
                        <button 
                            onClick={handleAddToCart}
                            className="flex-grow bg-primary text-white font-bold tracking-widest uppercase py-0 h-14 rounded-xl hover:bg-[#7a3c28] transition-colors shadow-md flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">shopping_bag</span>
                            Tambah - {formatPrice(currentPrice * quantity)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductModal;
