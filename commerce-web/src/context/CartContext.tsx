'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock?: number;
}

export interface CartContextType {
  cart: CartItem[];
  products: Product[];
  loading: boolean;
  error: string | null;
  total: number;
  itemCount: number;

  // Actions
  loadCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getProductDetails: (productId: string) => Product | undefined;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate totals
  const total = cart.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  /**
   * Load cart from API and fetch product details
   */
  const loadCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cart');
      if (!response.ok) throw new Error('Failed to fetch cart');
      const data = await response.json();

      setCart(data.cart || []);

      // Fetch product details
      const productResponse = await fetch('/api/products');
      if (productResponse.ok) {
        const productData = await productResponse.json();
        setProducts(productData.products || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cart';
      setError(message);
      console.error('Load cart error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add item to cart (or increase quantity if exists)
   */
  const addToCart = useCallback(
    async (productId: string, quantity: number = 1) => {
      setError(null);
      try {
        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, quantity }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to add item');
        }

        setCart(data.cart || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add to cart';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Remove item from cart (set quantity to 0)
   */
  const removeFromCart = useCallback(async (productId: string) => {
    setError(null);
    try {
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 0 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove item');
      }

      setCart(data.cart || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove from cart';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * Update item quantity
   */
  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    setError(null);
    try {
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update quantity');
      }

      setCart(data.cart || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update quantity';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/cart', { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to clear cart');
      }

      setCart([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear cart';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * Get product details by ID
   */
  const getProductDetails = useCallback(
    (productId: string) => {
      return products.find((p) => p.id === productId);
    },
    [products]
  );

  // Load cart on mount
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const value: CartContextType = {
    cart,
    products,
    loading,
    error,
    total,
    itemCount,
    loadCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getProductDetails,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
