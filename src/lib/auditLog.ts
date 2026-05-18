import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "booking.edit"
  | "booking.delete"
  | "booking.restore"
  | "booking.status_change"
  | "booking.payment_change"
  | "booking.confirm"
  | "booking.cancel_approve"
  | "booking.cancel_reject"
  | "booking.pickup_status_change"
  | "booking.pickup_detail_update";

export interface LogAdminActionParams {
  action: AuditAction;
  targetId: string;
  targetLabel?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any>;
}

/**
 * Insert a row into admin_audit_log. RLS only allows SELECT for Owner staff,
 * but inserts are allowed for any authenticated user (intended for staff-only callers).
 * Failure is logged to console but never throws — auditing must not block UX.
 */
export async function logAdminAction(params: LogAdminActionParams) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .order("role", { ascending: true })
      .limit(1)
      .maybeSingle();

    await supabase.from("admin_audit_log").insert({
      actor_id: userId,
      actor_role: (roleRow?.role as string) || null,
      action: params.action,
      target_type: "booking",
      target_id: params.targetId,
      target_label: params.targetLabel ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
      metadata: params.metadata ?? {},
    });
  } catch (e) {
    console.warn("[auditLog] failed", e);
  }
}

/** Build a shallow diff of changed fields (before vs after). */
export function diffFields<T extends Record<string, any>>(
  before: T,
  after: Partial<T>,
): { before: Partial<T>; after: Partial<T> } {
  const b: Partial<T> = {};
  const a: Partial<T> = {};
  for (const k of Object.keys(after) as (keyof T)[]) {
    if (before[k] !== after[k]) {
      b[k] = before[k];
      a[k] = after[k];
    }
  }
  return { before: b, after: a };
}
