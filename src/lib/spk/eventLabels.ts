// SPK Intelligence Suite — Operational label registry.
//
// Pure client-side interpretation over EXISTING spk_events / spk_timeline rows.
// No new persistence. Maps raw event_type + payload → human operational label.

export type OperationalStage =
  | "customer_arrived"
  | "spk_created"
  | "customer_approval_requested"
  | "customer_approved"
  | "assigned"
  | "inspection_started"
  | "inspection_completed"
  | "repair_started"
  | "work_completed"
  | "waiting_qc"
  | "qc_approved"
  | "qc_failed"
  | "invoice_generated"
  | "payment_completed"
  | "spk_closed"
  | "spk_cancelled"
  | "other";

export const STAGE_LABEL: Record<OperationalStage, string> = {
  customer_arrived: "Customer Arrived",
  spk_created: "SPK Created",
  customer_approval_requested: "Awaiting Customer Approval",
  customer_approved: "Customer Approved",
  assigned: "Assigned to Mechanic",
  inspection_started: "Inspection Started",
  inspection_completed: "Inspection Completed",
  repair_started: "Repair Started",
  work_completed: "Work Completed",
  waiting_qc: "Menunggu Final Check Mekanik",
  qc_approved: "Final Check Mekanik Selesai",
  qc_failed: "Mekanik — Perlu Perbaikan Ulang",
  invoice_generated: "Invoice Generated",
  payment_completed: "Payment Completed",
  spk_closed: "SPK Closed",
  spk_cancelled: "SPK Cancelled",
  other: "Update",
};

export const STAGE_ICON: Record<OperationalStage, string> = {
  customer_arrived: "user-round",
  spk_created: "file-plus",
  customer_approval_requested: "hourglass",
  customer_approved: "thumbs-up",
  assigned: "user-cog",
  inspection_started: "search",
  inspection_completed: "clipboard-check",
  repair_started: "wrench",
  work_completed: "check",
  waiting_qc: "shield",
  qc_approved: "shield-check",
  qc_failed: "shield-alert",
  invoice_generated: "receipt",
  payment_completed: "banknote",
  spk_closed: "check-circle",
  spk_cancelled: "x-circle",
  other: "circle",
};

/** Map a workflow status transition target to an operational stage. */
export function statusToStage(status: string | null | undefined): OperationalStage {
  switch (status) {
    case "draft": return "spk_created";
    case "awaiting_customer_approval": return "customer_approval_requested";
    case "approved": return "customer_approved";
    case "assigned": return "assigned";
    case "in_progress": return "repair_started";
    case "work_completed": return "work_completed";
    case "qc_pending": return "waiting_qc";
    case "qc_passed": return "qc_approved";
    case "qc_failed": return "qc_failed";
    case "invoice_issued": return "invoice_generated";
    case "invoice_paid": return "payment_completed";
    case "closed": return "spk_closed";
    case "cancelled": return "spk_cancelled";
    default: return "other";
  }
}

/** Interpret a single event row into an operational stage. */
export function eventToStage(evt: {
  event_type: string;
  payload?: unknown;
}): OperationalStage {
  const p = (evt.payload ?? {}) as Record<string, unknown>;
  switch (evt.event_type) {
    case "spk_created": return "spk_created";
    case "spk_closed": return "spk_closed";
    case "spk_cancelled": return "spk_cancelled";
    case "customer_arrived": return "customer_arrived";
    case "inspection_recorded": return "inspection_completed";
    case "approval_requested": return "customer_approval_requested";
    case "approval_resolved":
      return (p.status === "approved" ? "customer_approved" : "qc_failed");
    case "status_changed":
      return statusToStage(String(p.to ?? ""));
    default: return "other";
  }
}

export function stageLabel(stage: OperationalStage): string {
  return STAGE_LABEL[stage] ?? STAGE_LABEL.other;
}
