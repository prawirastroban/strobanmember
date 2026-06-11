import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ReportTemplate {
  id: string;
  owner_id: string;
  name: string;
  kind: "standard" | "builder";
  config: any;
  is_favorite: boolean;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export function useReportTemplates(kindFilter?: "standard" | "builder") {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("report_templates").select("*").order("is_favorite", { ascending: false }).order("updated_at", { ascending: false });
    if (kindFilter) q = q.eq("kind", kindFilter);
    const { data } = await q;
    setTemplates((data || []) as ReportTemplate[]);
    setLoading(false);
  }, [kindFilter]);

  useEffect(() => { reload(); }, [reload]);

  const save = async (payload: { name: string; kind: "standard" | "builder"; config: any; is_global?: boolean }) => {
    if (!user) throw new Error("Anda harus login.");
    const { data, error } = await supabase.from("report_templates").insert({
      owner_id: user.id,
      name: payload.name,
      kind: payload.kind,
      config: payload.config,
      is_global: payload.is_global ?? false,
    }).select().single();
    if (error) throw error;
    await reload();
    return data as ReportTemplate;
  };

  const update = async (id: string, patch: Partial<Pick<ReportTemplate, "name" | "config" | "is_favorite" | "is_global">>) => {
    const { error } = await supabase.from("report_templates").update(patch).eq("id", id);
    if (error) throw error;
    await reload();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("report_templates").delete().eq("id", id);
    if (error) throw error;
    await reload();
  };

  const duplicate = async (id: string) => {
    const src = templates.find((t) => t.id === id);
    if (!src) return;
    await save({ name: `${src.name} (Copy)`, kind: src.kind, config: src.config, is_global: false });
  };

  const toggleFavorite = async (id: string) => {
    const src = templates.find((t) => t.id === id);
    if (!src) return;
    await update(id, { is_favorite: !src.is_favorite });
  };

  return { templates, loading, reload, save, update, remove, duplicate, toggleFavorite };
}