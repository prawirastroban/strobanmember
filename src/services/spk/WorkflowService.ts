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

/** Zero-pads to 2 digits. */
const p2 = (n: number) => String(n).padStart(2, "0");

/** Build an auto-timestamp patch that only fills fields still blank so
 *  manual edits by the mechanic are always preserved. */
function buildTimePatch(
  now: Date,
  from: SpkStatus | null,
  to: SpkStatus,
  existing: Record<string, unknown>,
): Record<string, unknown> {
  const date = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`;
  const time = `${p2(now.getHours())}:${p2(now.getMinutes())}`;
  const patch: Record<string, unknown> = {};
  const isBlank = (k: string) => {
    const v = existing[k];
    return v === undefined || v === null || v === "";
  };
  const set = (k: string, v: unknown) => {
    if (isBlank(k)) patch[k] = v;
  };

  if (to === "in_progress" && from !== "in_progress") {
    set("time_start", time);
    set("date_in", date);
    set("time_in", time);
  }
  if (to === "work_completed" || to === "qc_pending") {
    set("time_end_work", time);
  }
  if (to === "closed") {
    set("time_end", time);
    set("time_out", time);
    set("date_out", date);
    // Compute duration (only if time_start is set/known).
    const startRaw = (existing["time_start"] as string) || patch["time_start"];
    if (typeof startRaw === "string" && /^\d{2}:\d{2}$/.test(startRaw)) {
      const [sh, sm] = startRaw.split(":").map(Number);
      const startDate = (existing["date_in"] as string) || (patch["date_in"] as string) || date;
      const startMs = new Date(`${startDate}T${p2(sh)}:${p2(sm)}:00`).getTime();
      const endMs = now.getTime();
      if (Number.isFinite(startMs) && endMs > startMs) {
        const mins = Math.round((endMs - startMs) / 60000);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        set("time_duration", h > 0 ? `${h}j ${m}m` : `${m}m`);
      }
    }
  }
  return patch;
}

export const WorkflowService = {
  /** Read available transitions from current status for a given actor role
   *  (or list of aliased roles). When an array is supplied, transitions
   *  are unioned and the returned to_status list is de-duplicated. */
  async availableTransitions(
    workflow_code: string,
    from_status: SpkStatus | null,
    actor_role: SpkActor | string[],
  ): Promise<ServiceResult<SpkStatus[]>> {
    const { data: wf, error: wErr } = await supabase
      .from("spk_workflow_definitions")
      .select("id")
      .eq("code", workflow_code)
      .eq("is_active", true)
      .maybeSingle();
    if (wErr || !wf) return fail("workflow_not_found", "WF_MISSING");

    const roles = Array.isArray(actor_role) ? actor_role : [actor_role];
    if (roles.length === 0) return ok([]);
    const query = supabase
      .from("spk_workflow_transitions")
      .select("to_status, from_status, actor_role")
      .eq("workflow_id", wf.id);
    const { data, error } = await (roles.length === 1
      ? query.eq("actor_role", roles[0] as SpkActor)
      : query.in("actor_role", roles as SpkActor[]));
    if (error) return fail(error.message);
    const seen = new Set<SpkStatus>();
    const list: SpkStatus[] = [];
    for (const t of data ?? []) {
      if ((t.from_status ?? null) !== from_status) continue;
      const s = t.to_status as SpkStatus;
      if (seen.has(s)) continue;
      seen.add(s);
      list.push(s);
    }
    return ok(list);
  },

  /** Validate + apply a status transition. Emits status_changed event. */
  async transition(input: TransitionInput): Promise<ServiceResult<{ from: SpkStatus | null; to: SpkStatus }>> {
    const { spk_id, workflow_code, to_status, reason = null, ctx } = input;

    // Load SPK current status
    const { data: spk, error: sErr } = await supabase
      .from("spk_orders")
      .select("id, status, data, assigned_to")
      .eq("id", spk_id)
      .maybeSingle();
    if (sErr || !spk) return fail("spk_not_found", "SPK_MISSING");
    const from_status = spk.status as SpkStatus;
    const existingData: Record<string, unknown> =
      spk.data && typeof spk.data === "object" && !Array.isArray(spk.data)
        ? (spk.data as Record<string, unknown>)
        : {};

    // Gate: closing an SPK requires the mechanic's final-check signature.
    if (to_status === "closed" && !existingData.signature_mekanik) {
      return fail(
        "Tanda tangan mekanik belum diisi (Section 11 — Final Check).",
        "WF_NEED_MECHANIC_SIG",
      );
    }

    // Validate transition exists for this actor
    // — resolve alias list so simplified roles can execute legacy actor
    //   transitions (reception/qc/cashier) that are still seeded in DB.
    const { getWorkflowRoles } = await import("@/runtime/form/RoleProfiles");
    const aliases = getWorkflowRoles(ctx.actor.role);
    const avail = await WorkflowService.availableTransitions(
      workflow_code,
      from_status,
      aliases.length ? aliases : ctx.actor.role,
    );
    if (avail.ok === false) return fail(avail.error, avail.code);
    if (!avail.data.includes(to_status)) {
      return fail(`illegal_transition:${from_status}->${to_status}`, "WF_ILLEGAL");
    }

    // Compute time-tracking patch (only fills blank fields).
    const now = new Date();
    const timePatch = buildTimePatch(now, from_status, to_status, existingData);

    // Attempt to populate mechanic_name if empty & we know who acted / who
    // is assigned. Best-effort — a failure here must not abort the transition.
    if (!existingData["mechanic_name"] && !timePatch["mechanic_name"]) {
      const uid = ctx.actor.user_id || (spk as any).assigned_to;
      if (uid && (to_status === "closed" || to_status === "qc_pending" || to_status === "work_completed" || to_status === "in_progress")) {
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", uid)
            .maybeSingle();
          if (prof?.full_name) timePatch["mechanic_name"] = prof.full_name;
        } catch {
          /* ignore */
        }
      }
    }

    const updatePayload: Record<string, unknown> = { status: to_status };
    if (Object.keys(timePatch).length > 0) {
      updatePayload.data = { ...existingData, ...timePatch };
    }

    // Apply status (+ merged data patch); DB trigger writes spk_status_history.
    const { error: uErr } = await supabase
      .from("spk_orders")
      .update(updatePayload)
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
