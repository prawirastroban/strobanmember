// Phase 4.2 — TimelineService
// Read-only projection from spk_events -> spk_timeline. No business logic here.
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { fail, ok, type ServiceResult, type SpkEventRow, type SpkTimelineRow } from "./types";

// Minimal label registry — a real deployment reads spk_event_type_registry.
// This mapping only produces human-readable titles for the projection.
const LABELS: Record<string, { title: string; icon?: string }> = {
  spk_created: { title: "SPK dibuat", icon: "file-plus" },
  spk_updated: { title: "SPK diperbarui", icon: "pencil" },
  status_changed: { title: "Status berubah", icon: "arrow-right-circle" },
  spk_closed: { title: "SPK ditutup", icon: "check-circle" },
  spk_cancelled: { title: "SPK dibatalkan", icon: "x-circle" },
  approval_requested: { title: "Approval diminta", icon: "shield" },
  approval_resolved: { title: "Approval diselesaikan", icon: "shield-check" },
  inspection_recorded: { title: "Hasil inspeksi dicatat", icon: "clipboard-check" },
  recommendation_generated: { title: "Rekomendasi dibuat", icon: "lightbulb" },
};

export const TimelineService = {
  /** Project a single event into the timeline table. Idempotent per event_id. */
  async projectFromEvent(evt: SpkEventRow): Promise<ServiceResult<SpkTimelineRow | null>> {
    const meta = LABELS[evt.event_type] ?? { title: evt.event_type };
    const { data, error } = await supabase
      .from("spk_timeline")
      .insert({
        spk_id: evt.spk_id,
        event_id: evt.id,
        event_type: evt.event_type,
        title: meta.title,
        icon: meta.icon ?? null,
        description: null,
        actor_role: evt.actor_role,
        actor_user_id: evt.actor_user_id,
        occurred_at: evt.occurred_at,
        meta: evt.payload as Json,
      })
      .select("*")
      .maybeSingle();
    if (error) return fail(error.message, "TIMELINE_PROJECT");
    return ok((data ?? null) as SpkTimelineRow | null);
  },

  async listBySpk(spk_id: string): Promise<ServiceResult<SpkTimelineRow[]>> {
    const { data, error } = await supabase
      .from("spk_timeline")
      .select("*")
      .eq("spk_id", spk_id)
      .order("occurred_at", { ascending: true });
    if (error) return fail(error.message);
    return ok((data ?? []) as SpkTimelineRow[]);
  },
};
