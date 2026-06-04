import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FilterState } from "./useFilterState";

export interface FilterPreset {
  id: string;
  name: string;
  payload: Partial<FilterState>;
}

export function useFilterPresets(moduleKey: string) {
  const { user } = useAuth();
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setPresets([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_filter_presets" as any)
      .select("id,name,payload")
      .eq("user_id", user.id)
      .eq("module", moduleKey)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPresets(data.map((r: any) => ({ id: r.id, name: r.name, payload: r.payload || {} })));
    }
    setLoading(false);
  }, [user, moduleKey]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (name: string, payload: Partial<FilterState>) => {
    if (!user) return;
    await supabase.from("user_filter_presets" as any).upsert({
      user_id: user.id,
      module: moduleKey,
      name,
      payload,
    }, { onConflict: "user_id,module,name" });
    await load();
  }, [user, moduleKey, load]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("user_filter_presets" as any).delete().eq("id", id);
    await load();
  }, [load]);

  return { presets, loading, save, remove, reload: load };
}