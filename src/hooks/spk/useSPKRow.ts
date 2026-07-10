import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSPKRow(id: string | null) {
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) { setRow(null); return; }
    let cancelled = false;
    setLoading(true);
    supabase.from("spk_orders").select("*").eq("id", id).maybeSingle().then(async ({ data }) => {
      if (cancelled) return;
      if (!data?.branch_id) {
        setRow(data);
        setLoading(false);
        return;
      }
      const { data: branch } = await supabase
        .from("branches")
        .select("name")
        .eq("id", data.branch_id)
        .maybeSingle();
      if (!cancelled) {
        setRow({ ...data, _branch_name: branch?.name ?? null });
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [id]);

  return { row, loading, setRow };
}