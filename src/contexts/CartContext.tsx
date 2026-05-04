import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  totalDuration: number;
  has: (id: string) => boolean;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  toggleItem: (item: CartItem) => void;
  setItems: (items: CartItem[]) => void;
  clear: () => void;
}

const STORAGE_KEY = "stroban_service_cart_v1";
const CartContext = createContext<CartContextValue | null>(null);

const readStorage = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is CartItem => x && typeof x.id === "string");
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItemsState] = useState<CartItem[]>(() => readStorage());
  const isHydrated = useRef(true);

  // Persist
  useEffect(() => {
    if (!isHydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setItemsState(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const addItem = useCallback((item: CartItem) => {
    setItemsState((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItemsState((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggleItem = useCallback((item: CartItem) => {
    setItemsState((prev) =>
      prev.some((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  }, []);

  const setItems = useCallback((next: CartItem[]) => {
    setItemsState(next);
  }, []);

  const clear = useCallback(() => setItemsState([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.length,
      total: items.reduce((s, i) => s + (i.price || 0), 0),
      totalDuration: items.reduce((s, i) => s + (i.duration || 0), 0),
      has,
      addItem,
      removeItem,
      toggleItem,
      setItems,
      clear,
    }),
    [items, has, addItem, removeItem, toggleItem, setItems, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    // Safe fallback so components don't crash if rendered outside provider.
    return {
      items: [],
      count: 0,
      total: 0,
      totalDuration: 0,
      has: () => false,
      addItem: () => {},
      removeItem: () => {},
      toggleItem: () => {},
      setItems: () => {},
      clear: () => {},
    };
  }
  return ctx;
};