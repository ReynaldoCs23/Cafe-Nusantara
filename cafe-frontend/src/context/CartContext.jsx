import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();
const STORAGE_KEY = 'cafe_cart_v2';

// Item keranjang: { cartItemId, product, quantity, modifiers: [{id, group, name, price_delta}], notes }
// eslint-disable-next-line react-refresh/only-export-components
export { unitPriceOf } from '../utils/pos';
import { unitPriceOf } from '../utils/pos';

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        try {
            localStorage.removeItem('cafe_cart'); // format lama (ukuran di-hardcode)
            const localData = localStorage.getItem(STORAGE_KEY);
            return localData ? JSON.parse(localData) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
        } catch {
            // penyimpanan penuh/diblokir: keranjang tetap jalan di memori
        }
    }, [cartItems]);

    const generateCartItemId = (productId, modifiers, notes) => {
        const ids = (modifiers || []).map((m) => m.id).sort((a, b) => a - b).join('.');
        return `${productId}|${ids}|${(notes || '').trim().toLowerCase()}`;
    };

    const addToCart = (product, quantity = 1, modifiers = [], notes = '') => {
        setCartItems((prev) => {
            const cartItemId = generateCartItemId(product.id, modifiers, notes);
            const existing = prev.find((item) => item.cartItemId === cartItemId);

            if (existing) {
                return prev.map((item) =>
                    item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prev, { cartItemId, product, quantity, modifiers, notes: notes.trim() }];
        });
    };

    const removeFromCart = (cartItemId) => {
        setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
    };

    const updateQuantity = (cartItemId, quantity) => {
        if (quantity < 1) {
            removeFromCart(cartItemId);
            return;
        }
        setCartItems((prev) => prev.map((item) => (item.cartItemId === cartItemId ? { ...item, quantity } : item)));
    };

    const clearCart = () => setCartItems([]);

    const subtotal = cartItems.reduce((sum, item) => sum + unitPriceOf(item) * item.quantity, 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, subtotal, itemCount }}>
            {children}
        </CartContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);
