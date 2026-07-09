// Phase 4.2 — ApprovalService
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { EventService } from "./EventService";
import {
  fail,
  ok,
  type ServiceResult,
  type SpkActor,
  type SpkApprovalRow,
  type SpkApprovalStatus,
  type SpkCommandContext,
} from "./types";

export interface RequestApprovalInput {
  spk_id: string;
  approval_type: string;
  approver_role: SpkActor;
  payload?: Json;
  ctx: SpkCommandContext;
}

export interface ResolveInput {
  approval_id: string;
  reason?: string | null;
  ctx: SpkCommandContext;
}

export const ApprovalService = {
  async request(input: RequestApprovalInput): Promise<ServiceResult<SpkApprovalRow>> {
    const { data, error } = await supabase
      .from("spk_approvals")
      .insert({
        spk_id: input.spk_id,
        approval_type: input.approval_type,
        approver_role: input.approver_role,
        payload: (input.payload ?? {}) as Json,
        requested_by: input.ctx.actor.user_id,
        status: "pending" as SpkApprovalStatus,
      })
      .select("*")
      .single();
    if (error || !data) return fail(error?.message ?? "approval_request_failed");
    await EventService.append({
      spk_id: input.spk_id,
      event_type: "approval_requested",
      payload: { approval_id: data.id, approval_type: input.approval_type, approver_role: input.approver_role },
      ctx: input.ctx,
    });
    return ok(data as SpkApprovalRow);
  },

  async resolve(
    { approval_id, reason = null, ctx }: ResolveInput,
    to: Extract<SpkApprovalStatus, "approved" | "rejected">,
  ): Promise<ServiceResult<SpkApprovalRow>> {
    const { data, error } = await supabase
      .from("spk_approvals")
      .update({
        status: to,
        reason,
        approver_user_id: ctx.actor.user_id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", approval_id)
      .select("*")
      .single();
    if (error || !data) return fail(error?.message ?? "approval_resolve_failed");
    await EventService.append({
      spk_id: data.spk_id,
      event_type: "approval_resolved",
      payload: { approval_id, status: to, reason },
      ctx,
    });
    return ok(data as SpkApprovalRow);
  },

  approve: (i: ResolveInput) => ApprovalService.resolve(i, "approved"),
  reject: (i: ResolveInput) => ApprovalService.resolve(i, "rejected"),
  /**
   * Escalate does NOT change DB status (enum has no "escalated"); it emits
   * an audit event so a higher-role actor can subsequently approve/reject.
   */
  async escalate({ approval_id, reason = null, ctx }: ResolveInput): Promise<ServiceResult<true>> {
    const { data, error } = await supabase
      .from("spk_approvals")
      .select("spk_id")
      .eq("id", approval_id)
      .maybeSingle();
    if (error || !data) return fail(error?.message ?? "approval_not_found");
    await EventService.append({
      spk_id: data.spk_id,
      event_type: "approval_escalated",
      payload: { approval_id, reason },
      ctx,
    });
    return ok(true);
  },

  async listBySpk(spk_id: string): Promise<ServiceResult<SpkApprovalRow[]>> {
    const { data, error } = await supabase
      .from("spk_approvals")
      .select("*")
      .eq("spk_id", spk_id)
      .order("requested_at", { ascending: true });
    if (error) return fail(error.message);
    return ok((data ?? []) as SpkApprovalRow[]);
  },
};
