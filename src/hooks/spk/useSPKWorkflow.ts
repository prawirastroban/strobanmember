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
import { RuntimeBus } from "@/runtime/spk/RuntimeBus";
import {
  OperationalConfigService,
  DEFAULT_APPROVAL_MATRIX,
  type ApprovalMatrixConfig,
} from "@/services/spk/OperationalConfigService";
import { getWorkflowRoles } from "@/runtime/form/RoleProfiles";
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
  awaiting_customer_approval: { label: "Kirim ke Customer untuk Approval", tone: "primary" },
  approved: { label: "Setujui SPK", tone: "primary" },
  assigned: { label: "Assign Mekanik", tone: "primary" },
  in_progress: { label: "Mulai Pengerjaan Mekanik", tone: "primary" },
  work_completed: { label: "Selesai Pengerjaan", tone: "safe" },
  qc_pending: { label: "Kirim ke Final Check Mekanik", tone: "primary" },
  qc_passed: { label: "Mekanik — Final Check Selesai", tone: "safe" },
  qc_failed: { label: "Mekanik — Perlu Perbaikan Ulang", tone: "danger" },
  invoice_issued: { label: "Terbitkan Invoice", tone: "primary" },
  invoice_paid: { label: "Catat Pembayaran", tone: "safe" },
  closed: { label: "Selesaikan SPK", tone: "safe" },
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
    // `final_approval` hanya mengendalikan invoice steps. Jangan pernah
    // menyembunyikan `closed` — kalau tidak SPK terkunci di qc_pending.
    if (!matrix.final_approval && (t === "invoice_issued" || t === "invoice_paid")) return false;
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
      // Ensure the Operational Config cache is warm before we ask the
      // engine for available transitions — so alias resolution + approval
      // matrix filtering both use the latest owner-edited rules.
      await OperationalConfigService.load();
      const [statusRes, listRes] = await Promise.all([
        StateEngine.getStatus(spkId),
        WorkflowEngine.listAvailable(spkId, workflowCode, ctx),
      ]);
      if (statusRes.ok === true) setStatus(statusRes.data);
      else setError(statusRes.error);
      if (listRes.ok === true) setAvailable(listRes.data);
      else if (statusRes.ok === true) setError(listRes.error);
      setMatrix(OperationalConfigService.getApprovalMatrix());
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spkId, workflowCode, ctx, runtimeAvailable]);

  useEffect(() => {
    void load();
  }, [load]);

  // Phase 5.9 — AutomationEngine publishes `runtime-refresh` to the
  // RuntimeBus after every operational event (status transitions, approvals,
  // inspections, …). The Canvas never calls automation directly; it just
  // listens here so its available actions stay live even when another tab
  // or a background job hopped the workflow.
  useEffect(() => {
    if (!runtimeAvailable || !spkId) return;
    const unsub = RuntimeBus.subscribe("runtime-refresh", (evt) => {
      if (evt.spk_id !== spkId) return;
      void load();
    });
    return unsub;
  }, [runtimeAvailable, spkId, load]);

  // React to Owner edits in the Operational Configuration Console (Role
  // Profiles / Approval Matrix). Configuration signals are global — no
  // spk_id filter.
  useEffect(() => {
    const unsub = RuntimeBus.subscribe("config-updated", () => {
      void load();
    });
    return unsub;
  }, [load]);

  // WorkflowEngine.listAvailable filters by ctx.actor.role only, but our
  // simplified roles need to see transitions seeded against legacy actor
  // keys (reception/qc/cashier/…). Union in the alias-resolved set here so
  // no data path drifts between .run() (which resolves aliases) and .list().
  useEffect(() => {
    if (!runtimeAvailable || !spkId) return;
    let cancelled = false;
    (async () => {
      const aliases = getWorkflowRoles(role);
      if (!aliases.length || (aliases.length === 1 && aliases[0] === role)) return;
      const { WorkflowService } = await import("@/services/spk/WorkflowService");
      const cur = await StateEngine.getStatus(spkId);
      if (cur.ok === false) return;
      const res = await WorkflowService.availableTransitions(workflowCode, cur.data, aliases);
      if (cancelled || res.ok === false) return;
      setAvailable((prev) => {
        const merged = new Set<SpkStatus>([...prev, ...res.data]);
        return Array.from(merged);
      });
    })();
    return () => { cancelled = true; };
  }, [runtimeAvailable, spkId, workflowCode, role, status]);

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