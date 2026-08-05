import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface CartDialogValue {
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (v: boolean) => void;
}

const CartDialogContext = createContext<CartDialogValue | null>(null);

export const CartDialogProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, openCart, closeCart, setOpen }), [open, openCart, closeCart]);
  return <CartDialogContext.Provider value={value}>{children}</CartDialogContext.Provider>;
};

export const useCartDialog = (): CartDialogValue => {
  const ctx = useContext(CartDialogContext);
  if (!ctx) {
    return { open: false, openCart: () => {}, closeCart: () => {}, setOpen: () => {} };
  }
  return ctx;
};
