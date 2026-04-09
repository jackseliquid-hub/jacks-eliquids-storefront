'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { DiscountRule, getDiscountRules, calculateBestPrice } from '@/lib/discounts';

export interface CartItem {
  id: string;
  productId?: string;
  slug: string;
  name: string;
  image: string;
  price: string; // original un-discounted formatted string e.g. "£3.50"
  category?: string;
  tags?: string[];
  quantity: number;
  variantName?: string;
}

interface CartContextValue {
  cartItems: CartItem[];
  cartCount: number;
  cartSubtotal: string;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'jacks-cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);

  // Load from localStorage on mount and fetch discounts
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCartItems(JSON.parse(stored));
      }
    } catch {}
    
    getDiscountRules().then(rules => setDiscountRules(rules)).catch(console.error);

    setIsMounted(true);
  }, []);

  // Persist to localStorage whenever cart changes
  useEffect(() => {
    if (!isMounted) return; // Prevent overwriting on initial mount
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch {}
  }, [cartItems, isMounted]);

  const addToCart = useCallback((product: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...product, quantity }];
    });
    setIsOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty < 1) return;
    setCartItems(prev =>
      prev.map(i => (i.id === id ? { ...i, quantity: qty } : i))
    );
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // Group quantities by productId to get accurate bulk tiers (e.g., mixing Red and Blue variants counts as 2 total)
  const productQuantities: Record<string, number> = {};
  cartItems.forEach(i => {
    const parentId = i.productId || i.id;
    productQuantities[parentId] = (productQuantities[parentId] || 0) + i.quantity;
  });

  // Calculate subtotal from formatted price strings dynamically applying discounts
  const subtotalNum = cartItems.reduce((sum, item) => {
    const parentId = item.productId || item.id;
    const totalQty = productQuantities[parentId] || item.quantity;
    
    const { price } = calculateBestPrice(
      item.price,
      totalQty,
      { id: parentId, category: item.category, tags: item.tags },
      discountRules
    );
    
    return sum + (price * item.quantity);
  }, 0);
  const cartSubtotal = `£${subtotalNum.toFixed(2)}`;

  // Provide a helper to let CartDrawer know the current individual price of an item
  const getCalculatedItemPrice = (item: CartItem) => {
    const parentId = item.productId || item.id;
    const totalQty = productQuantities[parentId] || item.quantity;
    return calculateBestPrice(
      item.price,
      totalQty,
      { id: parentId, category: item.category, tags: item.tags },
      discountRules
    );
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartSubtotal,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        getCalculatedItemPrice // dynamically appended so UI can call it
      } as any}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
