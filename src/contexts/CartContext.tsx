"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem } from '@/types/cart';

interface CartContextType {
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (serviceId: string) => void;
    updateCartItem: (item: CartItem) => void;
    clearCart: () => void;
    getTotalAmount: (services?: Array<{ id: string; price: number; options?: Array<{ id: string; price: number }> }>) => number;
    storeSlug: string | null;
    setStoreSlug: (slug: string | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'amber_booking_cart';
const STORE_SLUG_STORAGE_KEY = 'amber_booking_store_slug';

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [storeSlug, setStoreSlugState] = useState<string | null>(null);

    // 初期化時にlocalStorageから読み込む
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const savedCart = localStorage.getItem(CART_STORAGE_KEY);
                const savedStoreSlug = localStorage.getItem(STORE_SLUG_STORAGE_KEY);
                
                if (savedCart) {
                    const parsedCart = JSON.parse(savedCart);
                    if (Array.isArray(parsedCart)) {
                        setCart(parsedCart);
                    }
                }
                
                if (savedStoreSlug) {
                    setStoreSlugState(savedStoreSlug);
                }
            } catch (error) {
                console.error('Failed to load cart from localStorage:', error);
            }
        }
    }, []);

    // カートが変更されたらlocalStorageに保存
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
            } catch (error) {
                console.error('Failed to save cart to localStorage:', error);
            }
        }
    }, [cart]);

    // storeSlugが変更されたらlocalStorageに保存
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                if (storeSlug) {
                    localStorage.setItem(STORE_SLUG_STORAGE_KEY, storeSlug);
                } else {
                    localStorage.removeItem(STORE_SLUG_STORAGE_KEY);
                }
            } catch (error) {
                console.error('Failed to save storeSlug to localStorage:', error);
            }
        }
    }, [storeSlug]);

    const addToCart = useCallback((item: CartItem) => {
        setCart(prev => {
            const existingIndex = prev.findIndex(c => c.serviceId === item.serviceId);
            if (existingIndex > -1) {
                // 既存のアイテムを更新
                const newCart = [...prev];
                newCart[existingIndex] = {
                    ...newCart[existingIndex],
                    quantity: newCart[existingIndex].quantity + item.quantity,
                    selectedOptions: item.selectedOptions.length > 0 
                        ? item.selectedOptions 
                        : newCart[existingIndex].selectedOptions
                };
                return newCart;
            } else {
                // 新しいアイテムを追加
                return [...prev, item];
            }
        });
    }, []);

    const removeFromCart = useCallback((serviceId: string) => {
        setCart(prev => prev.filter(item => item.serviceId !== serviceId));
    }, []);

    const updateCartItem = useCallback((item: CartItem) => {
        setCart(prev => {
            if (item.quantity === 0) {
                return prev.filter(c => c.serviceId !== item.serviceId);
            }
            const existingIndex = prev.findIndex(c => c.serviceId === item.serviceId);
            if (existingIndex > -1) {
                const newCart = [...prev];
                newCart[existingIndex] = item;
                return newCart;
            } else {
                return [...prev, item];
            }
        });
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(CART_STORAGE_KEY);
        }
    }, []);

    const getTotalAmount = useCallback((services?: Array<{ id: string; price: number; options?: Array<{ id: string; price: number }> }>) => {
        if (!services) return 0;
        
        return cart.reduce((sum, item) => {
            const service = services.find(s => s.id === item.serviceId);
            if (!service) return sum;

            let itemPrice = service.price;
            const optionsCost = item.selectedOptions.reduce((optSum, optId) => {
                const opt = service.options?.find(o => o.id === optId);
                return optSum + (opt?.price || 0);
            }, 0);

            return sum + (item.quantity * (itemPrice + optionsCost));
        }, 0);
    }, [cart]);

    const setStoreSlug = useCallback((slug: string | null) => {
        setStoreSlugState(slug);
        // ストアが変わったらカートをクリア
        if (slug !== storeSlug && storeSlug !== null) {
            clearCart();
        }
    }, [storeSlug, clearCart]);

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                updateCartItem,
                clearCart,
                getTotalAmount,
                storeSlug,
                setStoreSlug,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}




