// Phase 4.2 — EventService
// Append-only writer to spk_events. All SPK activity flows through this.
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  fail,
  ok,
  type ServiceResult,
  type SpkCommandContext,
  type SpkEventRow,
} from "./types";
import { TimelineService } from "./TimelineService";

export interface AppendEventInput {
  spk_id: string;
  event_type: string; // must exist in spk_event_type_registry when strict mode is enabled
  payload?: Json;
  ctx: SpkCommandContext;
}

/**
 * EventService — the single writer to spk_events.
 * - Append-only (no update/delete anywhere).
 * - Emits Timeline projection as a side-effect.
 * - Never mutates spk_orders directly (that is the caller's / WorkflowService's job).
 */
export const EventService = {
  async append(input: AppendEventInput): Promise<ServiceResult<SpkEventRow>> {
    const { spk_id, event_type, payload = {}, ctx } = input;
    const { data, error } = await supabase
      .from("spk_events")
      .insert({
        spk_id,
        event_type,
        payload: payload as Json,
        actor_user_id: ctx.actor.user_id,
        actor_role: ctx.actor.role,
        correlation_id: ctx.correlation_id ?? null,
        causation_id: ctx.causation_id ?? null,
        occurred_at: ctx.occurred_at ?? new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error || !data) return fail(error?.message ?? "append_failed", "EVENT_APPEND");

    // Timeline projection is a side-effect; failure must not corrupt the event log.
    await TimelineService.projectFromEvent(data).catch(() => void 0);
    return ok(data as SpkEventRow);
  },

  async listBySpk(spk_id: string): Promise<ServiceResult<SpkEventRow[]>> {
    const { data, error } = await supabase
      .from("spk_events")
      .select("*")
      .eq("spk_id", spk_id)
      .order("occurred_at", { ascending: true });
    if (error) return fail(error.message);
    return ok((data ?? []) as SpkEventRow[]);
  },
};
