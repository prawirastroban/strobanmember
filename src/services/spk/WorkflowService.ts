// Phase 4.2 — WorkflowService
// Validates status transitions using spk_workflow_definitions + spk_workflow_transitions.
// No UI, no side-effects except EventService.append + spk_orders.status update.
import { supabase } from "@/integrations/supabase/client";
import { EventService } from "./EventService";
import {
  fail,
  ok,
  type ServiceResult,
  type SpkActor,
  type SpkCommandContext,
  type SpkStatus,
} from "./types";

export interface TransitionInput {
  spk_id: string;
  workflow_code: string; // e.g. "spk_default"
  to_status: SpkStatus;
  reason?: string | null;
  ctx: SpkCommandContext;
}

export const WorkflowService = {
  /** Read available transitions from current status for a given actor role. */
  async availableTransitions(
    workflow_code: string,
    from_status: SpkStatus | null,
    actor_role: SpkActor,
  ): Promise<ServiceResult<SpkStatus[]>> {
    const { data: wf, error: wErr } = await supabase
      .from("spk_workflow_definitions")
      .select("id")
      .eq("code", workflow_code)
      .eq("is_active", true)
      .maybeSingle();
    if (wErr || !wf) return fail("workflow_not_found", "WF_MISSING");

    const { data, error } = await supabase
      .from("spk_workflow_transitions")
      .select("to_status, from_status, actor_role")
      .eq("workflow_id", wf.id)
      .eq("actor_role", actor_role);
    if (error) return fail(error.message);
    const list = (data ?? [])
      .filter((t) => (t.from_status ?? null) === from_status)
      .map((t) => t.to_status as SpkStatus);
    return ok(list);
  },

  /** Validate + apply a status transition. Emits status_changed event. */
  async transition(input: TransitionInput): Promise<ServiceResult<{ from: SpkStatus | null; to: SpkStatus }>> {
    const { spk_id, workflow_code, to_status, reason = null, ctx } = input;

    // Load SPK current status
    const { data: spk, error: sErr } = await supabase
      .from("spk_orders")
      .select("id, status")
      .eq("id", spk_id)
      .maybeSingle();
    if (sErr || !spk) return fail("spk_not_found", "SPK_MISSING");
    const from_status = spk.status as SpkStatus;

    // Validate transition exists for this actor
    const avail = await WorkflowService.availableTransitions(workflow_code, from_status, ctx.actor.role);
    if (!avail.ok) return fail(avail.error, avail.code);
    if (!avail.ok || !avail.data.includes(to_status)) {
      return fail(`illegal_transition:${from_status}->${to_status}`, "WF_ILLEGAL");
    }

    // Apply status; the DB trigger writes spk_status_history.
    const { error: uErr } = await supabase
      .from("spk_orders")
      .update({ status: to_status })
      .eq("id", spk_id);
    if (uErr) return fail(uErr.message, "WF_UPDATE");

    await EventService.append({
      spk_id,
      event_type: "status_changed",
      payload: { from: from_status, to: to_status, reason, workflow_code },
      ctx,
    });

    return ok({ from: from_status, to: to_status });
  },
};
