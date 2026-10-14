import { useCallback, useEffect, useRef, useState } from "react";

/** Remembers pricelist tab, search, filters, open groups, loaded rows and scroll per tab, per user. */
export interface CatMemory<F, O> { q: string; filters: F; openMap: O; limit: number; scroll: number }
interface Mem<C extends string, F, O> { category: C; per: Partial<Record<C, CatMemory<F, O>>> }

export function usePricelistMemory<C extends string, F, O>(userId: string | undefined, defaults: { category: C; filters: F; openMap: O; limit: number }, isValidCat: (c: unknown) => c is C) {
  const key = `pricelist:state:v1:${userId ?? "anon"}`;
  const blank = (): CatMemory<F, O> => ({ q: "", filters: defaults.filters, openMap: defaults.openMap, limit: defaults.limit, scroll: 0 });
  const load = (): Mem<C, F, O> => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && isValidCat(p.category) && p.per && typeof p.per === "object") return p;
      }
    } catch { /* ignore */ }
    return { category: defaults.category, per: {} };
  };
  const [mem, setMem] = useState<Mem<C, F, O>>(load);
  const memRef = useRef(mem);
  memRef.current = mem;

  // reload when the user changes
  useEffect(() => { setMem(load()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);

  const save = useCallback(() => { try { localStorage.setItem(key, JSON.stringify(memRef.current)); } catch { /* ignore */ } }, [key]);
  useEffect(() => { const t = setTimeout(save, 300); return () => clearTimeout(t); }, [mem, save]);

  const cur: CatMemory<F, O> = { ...blank(), ...(mem.per[mem.category] ?? {}) };
  const patch = useCallback((p: Partial<CatMemory<F, O>>) => setMem(() => { const m = memRef.current; return { ...m, per: { ...m.per, [m.category]: { ...blank(), ...(m.per[m.category] ?? {}), ...p } } }; }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

  // track scroll position for current tab
  useEffect(() => {
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const m = memRef.current; const c = m.per[m.category]; memRef.current = { ...m, per: { ...m.per, [m.category]: { ...blank(), ...(c ?? {}), scroll: window.scrollY } } }; }); };
    const flush = () => { setMem(memRef.current); save(); };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    let idle: ReturnType<typeof setTimeout>;
    const onScrollEnd = () => { clearTimeout(idle); idle = setTimeout(flush, 400); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScrollEnd, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    return () => { flush(); window.removeEventListener("scroll", onScroll); window.removeEventListener("scroll", onScrollEnd); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pagehide", flush); clearTimeout(idle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);

  const setCategory = useCallback((c: C) => setMem((m) => ({ ...memRef.current, category: c, per: memRef.current.per ?? m.per })), []);

  return {
    category: mem.category, q: cur.q, filters: cur.filters, openMap: cur.openMap, limit: cur.limit, scroll: cur.scroll,
    setCategory,
    setQ: (q: string) => patch({ q }),
    setFilters: (filters: F) => patch({ filters }),
    setOpenMap: (openMap: O) => patch({ openMap }),
    setLimit: (v: number | ((l: number) => number)) => patch({ limit: typeof v === "function" ? v(cur.limit) : v }),
  };
}
