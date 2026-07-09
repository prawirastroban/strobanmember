// Phase 4.2 — Core Service Layer / Shared types
// Design-only: mirrors DB enums (see src/integrations/supabase/types.ts).
import type { Database } from "@/integrations/supabase/types";

export type SpkStatus = Database["public"]["Enums"]["spk_status"];
export type SpkPriority = Database["public"]["Enums"]["spk_priority"];
export type SpkActor = Database["public"]["Enums"]["spk_workflow_actor"];
export type SpkEventStatus = Database["public"]["Enums"]["spk_event_status"];
export type SpkApprovalStatus = Database["public"]["Enums"]["spk_approval_status"];
export type SpkFormFieldType = Database["public"]["Enums"]["spk_form_field_type"];

export type SpkOrderRow = Database["public"]["Tables"]["spk_orders"]["Row"];
export type SpkEventRow = Database["public"]["Tables"]["spk_events"]["Row"];
export type SpkTimelineRow = Database["public"]["Tables"]["spk_timeline"]["Row"];
export type SpkApprovalRow = Database["public"]["Tables"]["spk_approvals"]["Row"];

/** Common actor identity attached to every command. */
export interface SpkActorContext {
  user_id: string | null;
  role: SpkActor;
}

/** Standard command envelope — every operation carries these for auditability. */
export interface SpkCommandContext {
  actor: SpkActorContext;
  correlation_id?: string | null;
  causation_id?: string | null;
  occurred_at?: string; // ISO
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export const ok = <T,>(data: T): ServiceResult<T> => ({ ok: true, data });
export const fail = <T = never>(error: string, code?: string): ServiceResult<T> =>
  ({ ok: false, error, code });
