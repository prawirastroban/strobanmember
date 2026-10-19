import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withSpkLoadTimeout } from "@/lib/spk/loadTimeout";

export function useSPKRow(id: string | null) {
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!id) { setRow(null); setError(null); setLoading(false); return; }
    let cancelled = false;
    setRow(null);
    setError(null);
    setLoading(true);
    void (async () => {
      try {
        const { data, error: readError } = await withSpkLoadTimeout(
          supabase.from("spk_orders").select("*").eq("id", id).maybeSingle(),
        );
        if (cancelled) return;
        if (readError) throw readError;
        if (!data) throw new Error("SPK tidak ditemukan atau Anda tidak memiliki akses.");
        // Branch metadata is optional: the document must not wait for it.
        setRow(data);
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
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal memuat SPK. Silakan coba lagi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, retryTick]);

  return { row, loading, error, setRow, retry: () => setRetryTick((tick) => tick + 1) };
}