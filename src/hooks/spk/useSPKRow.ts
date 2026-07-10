import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSPKRow(id: string | null) {
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) { setRow(null); return; }
    let cancelled = false;
    setLoading(true);
    supabase.from("spk_orders").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!cancelled) { setRow(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [id]);

  return { row, loading, setRow };
}