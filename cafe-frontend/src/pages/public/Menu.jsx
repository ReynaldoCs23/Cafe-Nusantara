import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useCart } from '../../context/CartContext';
import ProductModal from '../../components/ProductModal';
import ProductCard from '../../components/ProductCard';

const Menu = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [sortOption, setSortOption] = useState('Rekomendasi');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const { addToCart } = useCart();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                api.get('/products'),
                api.get('/categories')
            ]);
            setProducts(productsRes.data.data.filter(p => p.is_active));
            setCategories(categoriesRes.data.data);
        } catch (error) {
            console.error("Failed to fetch menu data", error);
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
    };

    // Filter and Sort Logic
    let displayedProducts = [...products];
    if (activeCategory !== 'Semua') {
        displayedProducts = displayedProducts.filter(p => p.category && p.category.name === activeCategory);
    }

    if (sortOption === 'Harga: Rendah ke Tinggi') {
        displayedProducts.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'Harga: Tinggi ke Rendah') {
        displayedProducts.sort((a, b) => b.price - a.price);
    } else {
        // Rekomendasi
        displayedProducts.sort((a, b) => (b.is_recommended ? 1 : 0) - (a.is_recommended ? 1 : 0));
    }

    const openModal = (product) => {
        setSelectedProduct(product);
        setQuantity(1);
    };

    const closeModal = () => {
        setSelectedProduct(null);
    };

    const handleAddToCart = (product, qty, customizations = null) => {
        addToCart(product, qty, customizations);
        closeModal();
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center font-label-caps text-on-surface-variant">Loading Menu...</div>;
    }

    return (
        <div className="animate-fade-in relative">
            <div className="px-gutter pb-section-gap-desktop max-w-[1440px] mx-auto w-full">
                
                {/* Header */}
                <div className="pt-16 pb-10 text-center max-w-3xl mx-auto mb-12">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-amber-900 mb-4">Our Menu</h1>
                    <p className="text-lg text-gray-600 font-sans leading-relaxed">Jelajahi koleksi biji kopi pilihan dan minuman khas kami, diseduh dengan penuh dedikasi.</p>
                </div>

                {/* Filters & Sorting */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-gutter mb-grid-margin border-b border-outline-variant pb-base">
                    <div className="flex gap-base overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                        <button 
                            onClick={() => setActiveCategory('Semua')}
                            className={`${activeCategory === 'Semua' ? 'bg-primary text-on-primary border-primary' : 'border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'} font-label-caps text-label-caps px-4 py-2 rounded-full transition-colors whitespace-nowrap`}
                        >
                            Semua
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.name)}
                                className={`${activeCategory === cat.name ? 'bg-primary text-on-primary border-primary' : 'border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'} font-label-caps text-label-caps px-4 py-2 rounded-full transition-colors whitespace-nowrap`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                    
                    <div className="relative w-full md:w-auto">
                        <select 
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="appearance-none bg-transparent border-b border-outline-variant focus:border-on-surface focus:ring-0 font-body-md text-body-md text-on-surface py-2 pr-8 pl-0 w-full md:w-48 cursor-pointer outline-none transition-colors"
                        >
                            <option>Urutkan: Rekomendasi</option>
                            <option>Harga: Rendah ke Tinggi</option>
                            <option>Harga: Tinggi ke Rendah</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                    </div>
                </div>

                {/* Menu Grid */}
                {displayedProducts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-grid-margin">
                        {displayedProducts.map(product => (
                            <ProductCard 
                                key={product.id} 
                                product={product} 
                                onClick={openModal}
                                onAddToCart={addToCart}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-24 text-center">
                        <p className="text-on-surface-variant font-body-lg">Tidak ada produk ditemukan dalam kategori ini.</p>
                    </div>
                )}
            </div>

            {/* Product Detail Modal */}
            <ProductModal 
                product={selectedProduct} 
                isOpen={!!selectedProduct} 
                onClose={closeModal} 
                onAddToCart={handleAddToCart} 
            />
        </div>
    );
};

export default Menu;
