import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type OverlayName = "promo" | "wa" | "cookie";

// Lower index = higher priority.
const PRIORITY: OverlayName[] = ["promo", "wa", "cookie"];

interface OverlayQueueValue {
  active: OverlayName | null;
  request: (name: OverlayName) => void;
  release: (name: OverlayName) => void;
  isActive: (name: OverlayName) => boolean;
}

const OverlayQueueContext = createContext<OverlayQueueValue | null>(null);

export const OverlayQueueProvider = ({ children }: { children: ReactNode }) => {
  const [pending, setPending] = useState<Set<OverlayName>>(() => new Set());

  const request = useCallback((name: OverlayName) => {
    setPending((prev) => {
      if (prev.has(name)) return prev;
      const next = new Set(prev);
      next.add(name);
      return next;
    });
  }, []);

  const release = useCallback((name: OverlayName) => {
    setPending((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, []);

  const active = useMemo<OverlayName | null>(() => {
    for (const name of PRIORITY) {
      if (pending.has(name)) return name;
    }
    return null;
  }, [pending]);

  const value = useMemo<OverlayQueueValue>(
    () => ({
      active,
      request,
      release,
      isActive: (name) => active === name,
    }),
    [active, request, release],
  );

  return <OverlayQueueContext.Provider value={value}>{children}</OverlayQueueContext.Provider>;
};

export function useOverlayQueue(): OverlayQueueValue {
  const ctx = useContext(OverlayQueueContext);
  if (ctx) return ctx;
  // Safe fallback so components don't crash if provider missing.
  return {
    active: null,
    request: () => {},
    release: () => {},
    isActive: () => true,
  };
}