// Small helper: push an in-app notification to the customer's device when
// their SPK is (or continues to be) `awaiting_customer_approval`. The bell
// icon + car-badge in Navbar picks it up via realtime — no external link
// required for SPKs that originated from an app booking.
import { supabase } from "@/integrations/supabase/client";

export interface CustomerPingArgs {
  spkId: string;
  customerId: string;
  spkNumber?: string | null;
  variant?: "request" | "reminder";
}

export async function pingCustomerForApproval(
  args: CustomerPingArgs,
): Promise<{ ok: boolean; error?: string }> {
  const { spkId, customerId, spkNumber, variant = "request" } = args;
  if (!customerId) return { ok: false, error: "no_customer_id" };

  const title =
    variant === "reminder"
      ? "Pengingat: SPK menunggu persetujuan"
      : "SPK menunggu persetujuan Anda";
  const message = spkNumber
    ? `Buka SPK ${spkNumber} untuk meninjau & menandatangani.`
    : "Buka SPK Anda untuk meninjau & menandatangani.";

  const { error } = await supabase.from("notifications").insert({
    user_id: customerId,
    title,
    message,
    type: variant === "reminder" ? "spk_approval_reminder" : "spk_approval_request",
    category: "spk",
    priority: "high",
    action_url: `/spk/${spkId}/approve`,
    source: "spk_workflow",
    metadata: { spk_id: spkId, spk_number: spkNumber ?? null },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Idempotent variant: skip if an unread request already exists for this SPK. */
export async function pingCustomerForApprovalOnce(
  args: CustomerPingArgs,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const { spkId, customerId } = args;
  if (!customerId) return { ok: false, error: "no_customer_id" };
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", customerId)
    .eq("type", "spk_approval_request")
    .eq("is_read", false)
    .contains("metadata", { spk_id: spkId })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return { ok: true, skipped: true };
  return pingCustomerForApproval(args);
}