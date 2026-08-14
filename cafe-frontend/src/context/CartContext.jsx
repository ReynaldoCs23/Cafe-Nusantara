import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        try {
            const localData = localStorage.getItem('cafe_cart');
            return localData ? JSON.parse(localData) : [];
        } catch (e) {
            console.error("Could not parse cart data from local storage", e);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('cafe_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    // Helper to generate a unique ID for a cart item based on its customizations
    const generateCartItemId = (productId, customizations) => {
        if (!customizations) return `${productId}-default`;
        return `${productId}-${customizations.size || 'normal'}-${customizations.ice || 'normal'}-${customizations.sugar || 'normal'}`;
    };

    const addToCart = (product, quantity = 1, customizations = null) => {
        setCartItems(prev => {
            const cartItemId = generateCartItemId(product.id, customizations);
            const existing = prev.find(item => item.cartItemId === cartItemId);
            
            if (existing) {
                return prev.map(item => 
                    item.cartItemId === cartItemId 
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { cartItemId, product, quantity, customizations }];
        });
    };

    const removeFromCart = (cartItemId) => {
        setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
    };

    const updateQuantity = (cartItemId, quantity) => {
        if (quantity < 1) {
            removeFromCart(cartItemId);
            return;
        }
        setCartItems(prev => prev.map(item => 
            item.cartItemId === cartItemId 
                ? { ...item, quantity } 
                : item
        ));
    };

    const clearCart = () => setCartItems([]);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
