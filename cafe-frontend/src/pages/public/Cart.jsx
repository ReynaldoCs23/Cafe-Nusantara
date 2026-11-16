import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuote } from '../../hooks/useQuote';
import { useTableSession } from '../../hooks/useTableSession';
import { useCart, unitPriceOf } from '../../context/CartContext';
import { getImageUrl } from '../../utils/imageHelper';
import { calculateTotals, formatPrice, modifierSummary } from '../../utils/pos';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import PageIntro from '../../components/public/PageIntro';
import { Icon } from '../../components/ui';

/** Keranjang belanja dengan perkiraan total (total final dihitung server saat checkout). */
const Cart = () => {
    const { cartItems, updateQuantity, removeFromCart, subtotal, itemCount } = useCart();
    const navigate = useNavigate();
    const settings = useStoreSettings();
    const table = useTableSession();
    const quotePayload = useMemo(() => ({
        items: cartItems.map((item) => ({ product_id: item.product.id, quantity: item.quantity, modifier_ids: (item.modifiers || []).map((m) => m.id) })),
        table_token: table?.token || undefined,
    }), [cartItems, table]);
    // Total dari server agar promo otomatis langsung terlihat; perhitungan lokal sebagai cadangan
    const { quote } = useQuote('/orders/quote', quotePayload, cartItems.length > 0);
    const local = calculateTotals(subtotal, settings);
    const totals = quote
        ? { ...local, subtotal: quote.subtotal, service: quote.service_charge, tax: quote.tax_amount, rounding: quote.rounding, total: quote.grand_total, promo: quote.promo_discount, promoName: quote.promotion?.name }
        : local;

    if (cartItems.length === 0) {
        return (
            <div className="animate-fade-in pb-32">
                <PageIntro eyebrow="Keranjang" title="Keranjang Anda masih kosong." description="Temukan kopi dan hidangan favorit Anda di menu kami.">
                    <Link to="/menu" className="btn-primary btn-lg rounded-full px-8 mt-10 inline-flex">Lihat menu <Icon name="arrow_forward" /></Link>
                </PageIntro>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-32">
            <PageIntro eyebrow="Keranjang" title="Pesanan Anda" description={`${itemCount} item siap dipesan.`} />

            <div className="max-w-7xl mx-auto px-5 md:px-10 grid lg:grid-cols-[1fr_400px] gap-12 lg:gap-20 items-start">
                <ul className="border-t border-hairline">
                    {cartItems.map((item) => (
                        <li key={item.cartItemId} className="flex gap-5 md:gap-8 py-8 border-b border-hairline">
                            <div className="h-28 w-24 md:h-36 md:w-32 shrink-0 overflow-hidden rounded-xl bg-surface-container">
                                {item.product.image_url && <img src={getImageUrl(item.product.image_url)} alt="" className="h-full w-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <h3 className="font-display text-2xl leading-snug">{item.product.name}</h3>
                                        {item.modifiers?.length > 0 && <p className="text-sm text-on-surface-variant mt-1">{modifierSummary(item.modifiers)}</p>}
                                        {item.notes && <p className="text-sm italic text-on-surface-variant">“{item.notes}”</p>}
                                    </div>
                                    <button onClick={() => removeFromCart(item.cartItemId)} className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-error" aria-label={`Hapus ${item.product.name}`}>
                                        <Icon name="close" className="text-[20px]" />
                                    </button>
                                </div>
                                <div className="mt-auto pt-4 flex items-center justify-between">
                                    <div className="flex items-center rounded-full border border-hairline bg-paper">
                                        <button className="h-10 w-10 flex items-center justify-center text-on-surface-variant hover:text-ink" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} aria-label="Kurangi"><Icon name="remove" className="text-[18px]" /></button>
                                        <span className="w-8 text-center text-sm font-semibold tabular">{item.quantity}</span>
                                        <button className="h-10 w-10 flex items-center justify-center text-on-surface-variant hover:text-ink" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} aria-label="Tambah"><Icon name="add" className="text-[18px]" /></button>
                                    </div>
                                    <span className="text-lg text-primary tabular">{formatPrice(unitPriceOf(item) * item.quantity)}</span>
                                </div>
                            </div>
                        </li>
                    ))}
                    <li className="pt-6">
                        <Link to="/menu" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-ink"><Icon name="arrow_back" className="text-[18px]" /> Tambah menu lain</Link>
                    </li>
                </ul>

                <aside className="card p-8 lg:sticky lg:top-28">
                    <h2 className="font-display text-2xl mb-6">Ringkasan</h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between text-on-surface-variant"><dt>Subtotal</dt><dd className="tabular">{formatPrice(totals.subtotal)}</dd></div>
                        {totals.promo > 0 && <div className="flex justify-between text-sage"><dt>Promo · {totals.promoName}</dt><dd className="tabular">−{formatPrice(totals.promo)}</dd></div>}
                        {totals.service > 0 && <div className="flex justify-between text-on-surface-variant"><dt>Service charge</dt><dd className="tabular">{formatPrice(totals.service)}</dd></div>}
                        <div className="flex justify-between text-on-surface-variant"><dt>Pajak PB1 {totals.taxRate}%{totals.taxInclusive ? ' (termasuk)' : ''}</dt><dd className="tabular">{formatPrice(totals.tax)}</dd></div>
                        {totals.rounding !== 0 && <div className="flex justify-between text-on-surface-variant"><dt>Pembulatan</dt><dd className="tabular">{formatPrice(totals.rounding)}</dd></div>}
                    </dl>
                    <div className="flex items-end justify-between border-t border-hairline mt-6 pt-6">
                        <span className="label-caps">Total</span>
                        <span className="font-display text-3xl tabular">{formatPrice(totals.total)}</span>
                    </div>
                    <button onClick={() => navigate('/checkout')} className="btn-primary btn-lg rounded-full w-full mt-8">Lanjut ke pembayaran <Icon name="arrow_forward" /></button>
                    <p className="text-xs text-on-surface-variant text-center mt-4">Total final dihitung ulang saat pesanan dikirim.</p>
                </aside>
            </div>
        </div>
    );
};

export default Cart;
