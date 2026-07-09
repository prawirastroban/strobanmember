// Phase 4.2 — SPKService
// Owns lifecycle of spk_orders: create, update, close, cancel.
// All status changes MUST route through WorkflowService (§80, §85, §90).
// All activity MUST produce an event via EventService.
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { EventService } from "./EventService";
import { WorkflowService } from "./WorkflowService";
import {
  fail,
  ok,
  type ServiceResult,
  type SpkActor,
  type SpkCommandContext,
  type SpkOrderRow,
  type SpkPriority,
} from "./types";

export interface CreateSpkInput {
  branch_id: string;
  booking_id?: string | null;
  customer_id?: string | null;
  vehicle_id?: string | null;
  form_template_version_id?: string | null;
  priority?: SpkPriority;
  data?: Json;
  notes?: string | null;
  initial_owner_role?: SpkActor;
  ctx: SpkCommandContext;
}

export interface UpdateSpkInput {
  spk_id: string;
  patch: {
    data?: Json;
    notes?: string | null;
    priority?: SpkPriority;
    current_owner_role?: SpkActor;
    current_owner_user_id?: string | null;
  };
  ctx: SpkCommandContext;
}

/** Generate a per-branch SPK number: SPK/<BRANCH_CODE>/<YYYYMM>/<SEQ>. */
async function generateSpkNumber(branch_id: string): Promise<string> {
  const { data: br } = await supabase
    .from("branches")
    .select("name")
    .eq("id", branch_id)
    .maybeSingle();
  const code = (br?.name || "GEN").toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "GEN";
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count } = await supabase
    .from("spk_orders")
    .select("id", { count: "exact", head: true })
    .eq("branch_id", branch_id)
    .gte("created_at", monthStart);
  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `SPK/${code}/${ym}/${seq}`;
}

export const SPKService = {
  async create(input: CreateSpkInput): Promise<ServiceResult<SpkOrderRow>> {
    const spk_number = await generateSpkNumber(input.branch_id);
    const { data, error } = await supabase
      .from("spk_orders")
      .insert({
        spk_number,
        branch_id: input.branch_id,
        booking_id: input.booking_id ?? null,
        customer_id: input.customer_id ?? null,
        vehicle_id: input.vehicle_id ?? null,
        form_template_version_id: input.form_template_version_id ?? null,
        priority: input.priority ?? "normal",
        data: (input.data ?? {}) as Json,
        notes: input.notes ?? null,
        created_by: input.ctx.actor.user_id,
        current_owner_role: input.initial_owner_role ?? input.ctx.actor.role,
        current_owner_user_id: input.ctx.actor.user_id,
      })
      .select("*")
      .single();
    if (error || !data) return fail(error?.message ?? "spk_create_failed", "SPK_CREATE");

    await EventService.append({
      spk_id: data.id,
      event_type: "spk_created",
      payload: {
        spk_number: data.spk_number,
        branch_id: data.branch_id,
        booking_id: data.booking_id,
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id,
      },
      ctx: input.ctx,
    });
    return ok(data as SpkOrderRow);
  },

  async update({ spk_id, patch, ctx }: UpdateSpkInput): Promise<ServiceResult<SpkOrderRow>> {
    // Never allow status here — must go via WorkflowService.
    const { data, error } = await supabase
      .from("spk_orders")
      .update(patch)
      .eq("id", spk_id)
      .select("*")
      .single();
    if (error || !data) return fail(error?.message ?? "spk_update_failed", "SPK_UPDATE");
    await EventService.append({ spk_id, event_type: "spk_updated", payload: patch as Json, ctx });
    return ok(data as SpkOrderRow);
  },

  async close(
    spk_id: string,
    workflow_code: string,
    ctx: SpkCommandContext,
  ): Promise<ServiceResult<{ from: string | null; to: string }>> {
    const t = await WorkflowService.transition({ spk_id, workflow_code, to_status: "closed", ctx });
    if (!t.ok) return t;
    await supabase.from("spk_orders").update({ closed_at: new Date().toISOString() }).eq("id", spk_id);
    await EventService.append({ spk_id, event_type: "spk_closed", payload: {}, ctx });
    return ok(t.data);
  },

  async cancel(
    spk_id: string,
    workflow_code: string,
    reason: string,
    ctx: SpkCommandContext,
  ): Promise<ServiceResult<{ from: string | null; to: string }>> {
    const t = await WorkflowService.transition({
      spk_id,
      workflow_code,
      to_status: "cancelled",
      reason,
      ctx,
    });
    if (!t.ok) return t;
    await supabase
      .from("spk_orders")
      .update({ cancelled_at: new Date().toISOString(), cancelled_reason: reason })
      .eq("id", spk_id);
    await EventService.append({ spk_id, event_type: "spk_cancelled", payload: { reason }, ctx });
    return ok(t.data);
  },

  async getById(spk_id: string): Promise<ServiceResult<SpkOrderRow | null>> {
    const { data, error } = await supabase.from("spk_orders").select("*").eq("id", spk_id).maybeSingle();
    if (error) return fail(error.message);
    return ok((data ?? null) as SpkOrderRow | null);
  },
};
