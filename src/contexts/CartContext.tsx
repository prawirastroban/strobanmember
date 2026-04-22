import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";

// ========= Types =========
export interface TireCartItem {
  kind: "tire";
  id: string;          // unique cart key (= tire_id)
  tire_id: string;
  brand: string;
  type: string;
  size: string;
  image_url: string | null;
  unit_price: number;
  quantity: number;
}

export interface ServiceCartItem {
  kind: "service";
  id: string;          // unique cart key (= service_id)
  service_id: string;
  name: string;
  category: string;
  duration: number;    // minutes
  unit_price: number;
  quantity: 1;         // services always qty 1
  icon?: string;
}

export type CartItem = TireCartItem | ServiceCartItem;

interface CartContextValue {
  items: CartItem[];
  tireItems: TireCartItem[];
  serviceItems: ServiceCartItem[];
  count: number;
  tireCount: number;
  serviceCount: number;
  subtotal: number;
  tireSubtotal: number;
  serviceSubtotal: number;
  hasService: boolean;
  hasTire: boolean;
  addTire: (item: Omit<TireCartItem, "kind" | "id" | "quantity">, qty?: number) => void;
  addService: (item: Omit<ServiceCartItem, "kind" | "id" | "quantity">) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "stroban-cart-v2";
const LEGACY_KEY = "stroban-tire-cart-v1";

export const DEFAULT_TIRE_PRICE = 850000;
export const INSTALLATION_FEE_PER_TIRE = 50000;

// Migrate legacy tire-only cart to new format
const loadInitial = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CartItem[];
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy) as Array<{ tire_id: string; brand: string; type: string; size: string; image_url: string | null; unit_price: number; quantity: number }>;
      const migrated: CartItem[] = old.map(o => ({
        kind: "tire", id: o.tire_id, tire_id: o.tire_id, brand: o.brand, type: o.type,
        size: o.size, image_url: o.image_url, unit_price: o.unit_price, quantity: o.quantity,
      }));
      window.localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
    return [];
  } catch { return []; }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadInitial);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const addTire = useCallback<CartContextValue["addTire"]>((item, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.kind === "tire" && i.tire_id === item.tire_id);
      if (idx >= 0) {
        const copy = [...prev];
        const cur = copy[idx] as TireCartItem;
        copy[idx] = { ...cur, quantity: cur.quantity + qty };
        return copy;
      }
      return [...prev, { kind: "tire", id: item.tire_id, ...item, quantity: qty }];
    });
  }, []);

  const addService = useCallback<CartContextValue["addService"]>((item) => {
    setItems(prev => {
      if (prev.some(i => i.kind === "service" && i.service_id === item.service_id)) return prev;
      return [...prev, { kind: "service", id: item.service_id, quantity: 1, ...item }];
    });
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      if (i.kind === "service") return i; // services fixed qty
      return { ...i, quantity: Math.max(1, qty) };
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const tireItems = items.filter((i): i is TireCartItem => i.kind === "tire");
    const serviceItems = items.filter((i): i is ServiceCartItem => i.kind === "service");
    const tireCount = tireItems.reduce((s, i) => s + i.quantity, 0);
    const serviceCount = serviceItems.length;
    const tireSubtotal = tireItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const serviceSubtotal = serviceItems.reduce((s, i) => s + i.unit_price, 0);
    return {
      items, tireItems, serviceItems,
      count: tireCount + serviceCount,
      tireCount, serviceCount,
      subtotal: tireSubtotal + serviceSubtotal,
      tireSubtotal, serviceSubtotal,
      hasService: serviceItems.length > 0,
      hasTire: tireItems.length > 0,
      addTire, addService, updateQty, removeItem, clear,
    };
  }, [items, addTire, addService, updateQty, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      items: [], tireItems: [], serviceItems: [],
      count: 0, tireCount: 0, serviceCount: 0,
      subtotal: 0, tireSubtotal: 0, serviceSubtotal: 0,
      hasService: false, hasTire: false,
      addTire: () => {}, addService: () => {},
      updateQty: () => {}, removeItem: () => {}, clear: () => {},
    };
  }
  return ctx;
};

// Backwards compat aliases (so existing imports don't break during transition)
export const TireCartProvider = CartProvider;
export const useTireCart = () => {
  const c = useCart();
  return {
    items: c.tireItems,
    count: c.tireCount,
    subtotal: c.tireSubtotal,
    addItem: (i: Omit<TireCartItem, "kind" | "id" | "quantity">, q?: number) => c.addTire(i, q),
    updateQty: c.updateQty,
    removeItem: c.removeItem,
    clear: c.clear,
  };
};
