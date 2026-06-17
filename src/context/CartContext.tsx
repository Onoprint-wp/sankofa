"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  price: number;
  rental_price_per_month?: number;
  is_rental_available: boolean;
  photos: string[];
  mode?: "buy" | "rent";
  rental_duration_months?: 1 | 3 | 6;
  exhibition_id?: string;
}

interface CartContextType {
  cartItem: CartItem | null;
  addToCart: (item: CartItem) => void;
  removeFromCart: () => void;
  clearCart: () => void;
  updateCartItemMode: (mode: "buy" | "rent") => void;
  updateCartItemDuration: (duration: 1 | 3 | 6) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItem, setCartItem] = useState<CartItem | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("sankofa_cart");
    if (savedCart) {
      try {
        setCartItem(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error loading cart", e);
      }
    }
  }, []);

  const addToCart = (item: CartItem) => {
    const newItem = {
      ...item,
      mode: item.mode || "buy",
      rental_duration_months: item.rental_duration_months || 1,
    };
    setCartItem(newItem);
    localStorage.setItem("sankofa_cart", JSON.stringify(newItem));
  };

  const removeFromCart = () => {
    setCartItem(null);
    localStorage.removeItem("sankofa_cart");
  };

  const clearCart = () => {
    setCartItem(null);
    localStorage.removeItem("sankofa_cart");
  };

  const updateCartItemMode = (mode: "buy" | "rent") => {
    if (!cartItem) return;
    const newItem = { ...cartItem, mode };
    setCartItem(newItem);
    localStorage.setItem("sankofa_cart", JSON.stringify(newItem));
  };

  const updateCartItemDuration = (duration: 1 | 3 | 6) => {
    if (!cartItem) return;
    const newItem = { ...cartItem, rental_duration_months: duration };
    setCartItem(newItem);
    localStorage.setItem("sankofa_cart", JSON.stringify(newItem));
  };

  return (
    <CartContext.Provider
      value={{
        cartItem,
        addToCart,
        removeFromCart,
        clearCart,
        updateCartItemMode,
        updateCartItemDuration,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
