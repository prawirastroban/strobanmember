// Phase 4.2 — AnalyticsService
// Aggregates event data into spk_analytics_daily buckets. Read-only projection.
// Never writes to spk_orders/spk_events. No dashboard here — UI comes in a later phase.
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { fail, ok, type ServiceResult } from "./types";

export interface BumpMetricInput {
  branch_id: string | null;
  bucket_date: string; // YYYY-MM-DD
  metric_code: string; // e.g. "spk_created", "spk_closed", "avg_close_minutes"
  delta?: number; // default 1
  meta?: Json;
}

export const AnalyticsService = {
  /** Upsert-style increment for a daily metric bucket. */
  async bump(input: BumpMetricInput): Promise<ServiceResult<true>> {
    const delta = input.delta ?? 1;
    const { data: existing } = await supabase
      .from("spk_analytics_daily")
      .select("id, metric_value")
      .eq("branch_id", input.branch_id)
      .eq("bucket_date", input.bucket_date)
      .eq("metric_code", input.metric_code)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("spk_analytics_daily")
        .update({
          metric_value: Number(existing.metric_value) + delta,
          meta: (input.meta ?? null) as Json,
        })
        .eq("id", existing.id);
      if (error) return fail(error.message);
    } else {
      const { error } = await supabase.from("spk_analytics_daily").insert({
        branch_id: input.branch_id,
        bucket_date: input.bucket_date,
        metric_code: input.metric_code,
        metric_value: delta,
        meta: (input.meta ?? null) as Json,
      });
      if (error) return fail(error.message);
    }
    return ok(true);
  },

  /**
   * Map an event to KPI bumps. Called after EventService.append at a higher layer
   * (e.g. a nightly job or an event-sink). Keeps AnalyticsService independent.
   */
  metricCodeFor(event_type: string): string | null {
    switch (event_type) {
      case "spk_created": return "spk_created";
      case "spk_closed": return "spk_closed";
      case "spk_cancelled": return "spk_cancelled";
      case "status_changed": return "status_changed";
      case "approval_requested": return "approval_requested";
      case "approval_resolved": return "approval_resolved";
      case "inspection_recorded": return "inspection_recorded";
      case "recommendation_generated": return "recommendation_generated";
      default: return null;
    }
  },

  async readDay(branch_id: string | null, bucket_date: string) {
    let q = supabase.from("spk_analytics_daily").select("*").eq("bucket_date", bucket_date);
    q = branch_id ? q.eq("branch_id", branch_id) : q.is("branch_id", null);
    const { data, error } = await q;
    if (error) return fail(error.message);
    return ok(data ?? []);
  },
};
