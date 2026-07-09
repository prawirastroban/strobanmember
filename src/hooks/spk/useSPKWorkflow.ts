// Phase 5.8 — Workflow Runtime Integration hook.
//
// Canvas ← Runtime ← WorkflowEngine. Canvas never determines workflow state,
// it just renders the actions exposed here.
//
// Responsibilities:
//   - Load current SPK status via StateEngine.
//   - Ask WorkflowEngine.listAvailable() for role-scoped transitions.
//   - Expose runTransition() that delegates to WorkflowEngine.run() (which
//     emits status_changed via EventEngine → TimelineEngine).
//   - Respect Operational Configuration (`spk.approval_matrix`): when
//     manager/final approval is disabled, hide the corresponding hops.
import { useCallback, useEffect, useMemo, useState } from "react";
import { WorkflowEngine } from "@/runtime/spk/WorkflowEngine";
import { StateEngine } from "@/runtime/spk/StateEngine";
import {
  OperationalConfigService,
  DEFAULT_APPROVAL_MATRIX,
  type ApprovalMatrixConfig,
} from "@/services/spk/OperationalConfigService";
import type { SpkActor, SpkCommandContext, SpkStatus } from "@/services/spk/types";

export interface WorkflowAction {
  to_status: SpkStatus;
  label: string;
  tone: "primary" | "safe" | "warn" | "danger" | "neutral";
}

/** Human-readable Indonesian labels + visual tone per target status.
 *  Owner can override the label later via metadata (Phase 5.9+). */
const ACTION_META: Record<SpkStatus, { label: string; tone: WorkflowAction["tone"] }> = {
  draft: { label: "Kembali ke Draft", tone: "neutral" },
  awaiting_customer_approval: { label: "Kirim Persetujuan Customer", tone: "primary" },
  approved: { label: "Setujui SPK", tone: "primary" },
  assigned: { label: "Assign Mekanik", tone: "primary" },
  in_progress: { label: "Mulai / Lanjut Kerjakan", tone: "primary" },
  work_completed: { label: "Selesai Pengerjaan", tone: "safe" },
  qc_pending: { label: "Kirim ke QC", tone: "primary" },
  qc_passed: { label: "QC — Approve", tone: "safe" },
  qc_failed: { label: "QC — Reject / Rework", tone: "danger" },
  invoice_issued: { label: "Terbitkan Invoice", tone: "primary" },
  invoice_paid: { label: "Catat Pembayaran", tone: "safe" },
  closed: { label: "Tutup SPK", tone: "safe" },
  cancelled: { label: "Batalkan SPK", tone: "danger" },
};

/** UUID guard so we don't blast the DB with garbage keys when the Canvas
 *  is opened without a real SPK id (design preview mode). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidSpkId = (s: string | null | undefined): s is string =>
  typeof s === "string" && UUID_RE.test(s);

/** Filter transitions based on Owner's Approval Matrix configuration. */
function filterByApproval(
  targets: SpkStatus[],
  matrix: ApprovalMatrixConfig,
): SpkStatus[] {
  return targets.filter((t) => {
    if (!matrix.qc_required && (t === "qc_pending" || t === "qc_passed" || t === "qc_failed")) return false;
    if (!matrix.manager_approval && t === "approved") {
      // manager approval disabled → skip the explicit approved step (still allow
      // reception to keep the standard hop if manager_approval is enabled).
      // We keep the transition so reception can still auto-approve.
      return true;
    }
    if (!matrix.final_approval && t === "closed") return false;
    return true;
  });
}

export interface UseSPKWorkflowOptions {
  spkId: string | null | undefined;
  role: SpkActor;
  userId?: string | null;
  workflowCode?: string;
}

export interface UseSPKWorkflowResult {
  status: SpkStatus | null;
  actions: WorkflowAction[];
  loading: boolean;
  runtimeAvailable: boolean;
  error: string | null;
  runTransition: (to: SpkStatus, reason?: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

export function useSPKWorkflow(opts: UseSPKWorkflowOptions): UseSPKWorkflowResult {
  const { spkId, role, userId = null, workflowCode = "spk_default" } = opts;
  const [status, setStatus] = useState<SpkStatus | null>(null);
  const [available, setAvailable] = useState<SpkStatus[]>([]);
  const [matrix, setMatrix] = useState<ApprovalMatrixConfig>(DEFAULT_APPROVAL_MATRIX);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runtimeAvailable = isValidSpkId(spkId);

  const ctx: SpkCommandContext = useMemo(
    () => ({ actor: { user_id: userId, role } }),
    [userId, role],
  );

  const load = useCallback(async () => {
    if (!runtimeAvailable || !spkId) {
      setStatus(null);
      setAvailable([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [statusRes, listRes, raw] = await Promise.all([
        StateEngine.getStatus(spkId),
        WorkflowEngine.listAvailable(spkId, workflowCode, ctx),
        OperationalConfigService.getRaw<Partial<ApprovalMatrixConfig>>("spk.approval_matrix"),
      ]);
      if (statusRes.ok === true) setStatus(statusRes.data);
      else setError(statusRes.error);
      if (listRes.ok === true) setAvailable(listRes.data);
      else if (statusRes.ok === true) setError(listRes.error);
      setMatrix({ ...DEFAULT_APPROVAL_MATRIX, ...(raw ?? {}) });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spkId, workflowCode, ctx, runtimeAvailable]);

  useEffect(() => {
    void load();
  }, [load]);

  const runTransition = useCallback<UseSPKWorkflowResult["runTransition"]>(
    async (to, reason) => {
      if (!runtimeAvailable || !spkId) {
        return { ok: false, error: "runtime_unavailable" };
      }
      const res = await WorkflowEngine.run({
        spk_id: spkId,
        workflow_code: workflowCode,
        to_status: to,
        reason: reason ?? null,
        ctx,
      });
      if (res.ok === false) return { ok: false, error: res.error };
      // Refresh state + available transitions after mutation.
      await load();
      return { ok: true };
    },
    [spkId, workflowCode, ctx, runtimeAvailable, load],
  );

  const actions: WorkflowAction[] = useMemo(() => {
    const gated = filterByApproval(available, matrix);
    return gated.map((to) => ({
      to_status: to,
      label: ACTION_META[to]?.label ?? to,
      tone: ACTION_META[to]?.tone ?? "neutral",
    }));
  }, [available, matrix]);

  return {
    status,
    actions,
    loading,
    runtimeAvailable,
    error,
    runTransition,
    refresh: load,
  };
}