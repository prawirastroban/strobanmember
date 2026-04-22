import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";

export interface CartItem {
  tire_id: string;
  brand: string;
  type: string;
  size: string;
  image_url: string | null;
  unit_price: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  updateQty: (tire_id: string, qty: number) => void;
  removeItem: (tire_id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "stroban-tire-cart-v1";

// Default tire prices when DB has no price (Indonesia retail estimate per piece)
export const DEFAULT_TIRE_PRICE = 850000;
export const INSTALLATION_FEE_PER_TIRE = 50000;

export const TireCartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const addItem = useCallback<CartContextValue["addItem"]>((item, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.tire_id === item.tire_id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + qty };
        return copy;
      }
      return [...prev, { ...item, quantity: qty }];
    });
  }, []);

  const updateQty = useCallback((tire_id: string, qty: number) => {
    setItems(prev => prev
      .map(i => i.tire_id === tire_id ? { ...i, quantity: Math.max(1, qty) } : i)
    );
  }, []);

  const removeItem = useCallback((tire_id: string) => {
    setItems(prev => prev.filter(i => i.tire_id !== tire_id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    return { items, count, subtotal, addItem, updateQty, removeItem, clear };
  }, [items, addItem, updateQty, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useTireCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    // Safe fallback to avoid crashing if used outside provider
    return {
      items: [], count: 0, subtotal: 0,
      addItem: () => {}, updateQty: () => {}, removeItem: () => {}, clear: () => {},
    };
  }
  return ctx;
};