import { useState } from 'react';
import ProductModal from './ProductModal';
import { Icon } from './ui';
import { formatPrice } from '../utils/pos';

/**
 * Kartu produk editorial (DESIGN.md): foto sebagai fokus, tanpa kotak dan bayangan.
 * Tombol "+" langsung menambah produk tanpa pilihan wajib; selain itu membuka detail.
 */
const ProductCard = ({ product, onClick, onAddToCart }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const soldOut = product.is_sold_out;
    const needsChoice = (product.modifier_groups || []).some((g) => g.min_select > 0);

    const openDetail = () => (onClick ? onClick(product) : setModalOpen(true));

    const quickAdd = (e) => {
        e.stopPropagation();
        if (soldOut) return;
        if (needsChoice) return openDetail();
        onAddToCart?.(product, 1, [], '');
    };

    return (
        <>
            <article className="group cursor-pointer" onClick={openDetail}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-container">
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.name} loading="lazy"
                            className={`h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04] ${soldOut ? 'grayscale opacity-60' : ''}`} />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-on-surface-variant/30"><Icon name="local_cafe" className="text-6xl" /></div>
                    )}
                    {soldOut && <span className="absolute left-4 top-4 chip bg-ink text-cream border-ink">Habis</span>}
                    {!soldOut && product.is_recommended && <span className="absolute left-4 top-4 chip bg-cream/90 text-primary border-transparent">Favorit</span>}
                    <button onClick={quickAdd} disabled={soldOut} aria-label={needsChoice ? `Pilih varian ${product.name}` : `Tambah ${product.name}`}
                        className="absolute right-4 bottom-4 h-12 w-12 rounded-full bg-cream text-ink flex items-center justify-center transition-all duration-300 hover:bg-primary hover:text-white disabled:opacity-0 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0">
                        <Icon name="add" />
                    </button>
                </div>
                <div className="pt-5">
                    <p className="label-caps mb-1.5">{product.category?.name}</p>
                    <div className="flex items-baseline justify-between gap-4">
                        <h3 className="font-display text-2xl leading-snug text-ink group-hover:text-primary transition-colors">{product.name}</h3>
                        <span className="text-primary font-medium tabular whitespace-nowrap">{formatPrice(product.price)}</span>
                    </div>
                    {product.description && <p className="mt-1.5 text-sm text-on-surface-variant line-clamp-2 leading-relaxed">{product.description}</p>}
                </div>
            </article>

            {!onClick && (
                <ProductModal product={product} isOpen={modalOpen} onClose={() => setModalOpen(false)}
                    onAddToCart={(p, qty, modifiers, notes) => { onAddToCart?.(p, qty, modifiers, notes); setModalOpen(false); }} />
            )}
        </>
    );
};

export default ProductCard;
