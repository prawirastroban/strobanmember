import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withSpkLoadTimeout } from "@/lib/spk/loadTimeout";

// Last-seen rows so reopening an SPK shows instantly while revalidating.
const rowCache = new Map<string, any>();

export function useSPKRow(id: string | null) {
  const [row, setRowState] = useState<any>(() => (id ? rowCache.get(id) ?? null : null));
  const [loading, setLoading] = useState(!!id && !rowCache.has(id));
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const setRow: typeof setRowState = (v) =>
    setRowState((cur: any) => {
      const next = typeof v === "function" ? (v as any)(cur) : v;
      if (next?.id) rowCache.set(next.id, next);
      return next;
    });

  useEffect(() => {
    if (!id) { setRowState(null); setError(null); setLoading(false); return; }
    let cancelled = false;
    const cached = rowCache.get(id);
    setError(null);
    if (cached) { setRowState(cached); setLoading(false); }
    else { setRowState(null); setLoading(true); }
    void (async () => {
      try {
        const { data, error: readError } = await withSpkLoadTimeout(
          supabase.from("spk_orders").select("*").eq("id", id).maybeSingle(),
        );
        if (cancelled) return;
        if (readError) throw readError;
        if (!data) throw new Error("SPK tidak ditemukan atau Anda tidak memiliki akses.");
        const merged = { ...data, _branch_name: rowCache.get(id)?._branch_name ?? null };
        rowCache.set(id, merged);
        setRowState(merged);
        setLoading(false);
        if (data.branch_id) {
          try {
            const { data: branch } = await withSpkLoadTimeout(
              supabase.from("branches").select("name").eq("id", data.branch_id).maybeSingle(),
            );
            if (!cancelled) setRow((current: any) => current ? { ...current, _branch_name: branch?.name ?? null } : current);
          } catch { /* A missing branch label must not hide a saved SPK. */ }
        }
      } catch (e) {
        if (!cancelled && !rowCache.has(id)) setError(e instanceof Error ? e.message : "Gagal memuat SPK. Silakan coba lagi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, retryTick]);

  return { row, loading, error, setRow, retry: () => setRetryTick((tick) => tick + 1) };
}
