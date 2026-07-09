// Phase 4.4 — SPK Runtime Orchestrator
//
// Single entry point for every Digital SPK business operation. Higher layers
// (UI, hooks, edge functions, jobs) MUST call the Orchestrator — never engines
// or services directly. The Orchestrator adds no business logic; it only
// coordinates the engines in a consistent order:
//
//     WorkflowEngine → StateEngine → EventEngine → TimelineEngine → AutomationEngine
//
// Design rules (per Blueprint §80–§111):
//   1. Every command carries a SpkCommandContext (actor, correlation_id, causation_id).
//   2. Status changes flow through WorkflowEngine.run() only.
//   3. Non-status side-effects emit through EventEngine.emit() only.
//   4. On failure at any step, the Orchestrator short-circuits — no partial state
//      is invented; downstream engines rely on append-only guarantees so no
//      compensating rollback is required (partial event ≠ partial status).
//   5. Extension points (AI, Predictive Maintenance, Push, WhatsApp, Analytics)
//      hook in via AutomationEngine.register() — never by editing this file.
//
// Sequence (typical command):
//
//     Caller ──▶ SPKOrchestrator.<command>
//                      │
//                      ├─▶ (optional) StateEngine.getStatus        [guard]
//                      ├─▶ WorkflowEngine.run (if status changes)  [validated]
//                      ├─▶ Service mutation (Approval / Inspection / …)
//                      ├─▶ EventEngine.emit(<event_type>)          [append-only]
//                      │        └─▶ subscribers fan-out:
//                      │              • TimelineEngine (projection via EventService)
//                      │              • AutomationEngine → Analytics / Notif / AI
//                      └─▶ ServiceResult<T>
//
import { ApprovalService } from "@/services/spk/ApprovalService";
import { InspectionService, type InspectionItem } from "@/services/spk/InspectionService";
import { RecommendationService } from "@/services/spk/RecommendationService";
import { SPKService, type CreateSpkInput, type UpdateSpkInput } from "@/services/spk/SPKService";
import type {
  ServiceResult,
  SpkApprovalRow,
  SpkCommandContext,
  SpkOrderRow,
  SpkStatus,
} from "@/services/spk/types";
import type { Json } from "@/integrations/supabase/types";
import { EventEngine } from "./EventEngine";
import { StateEngine } from "./StateEngine";
import { WorkflowEngine } from "./WorkflowEngine";

const DEFAULT_WORKFLOW = "spk_default";

export interface OrchestratorTransitionInput {
  spk_id: string;
  to_status: SpkStatus;
  workflow_code?: string;
  reason?: string | null;
  ctx: SpkCommandContext;
}

export interface OrchestratorRequestApprovalInput {
  spk_id: string;
  approval_type: string;
  approver_role: SpkApprovalRow["approver_role"];
  payload?: Json;
  ctx: SpkCommandContext;
}

export interface OrchestratorResolveApprovalInput {
  approval_id: string;
  reason?: string | null;
  ctx: SpkCommandContext;
}

export interface OrchestratorInspectionInput {
  spk_id: string;
  items: InspectionItem[];
  ctx: SpkCommandContext;
}

/**
 * Guard: refuse commands on terminal SPKs. Returns ok(true) if it is safe to
 * continue, or a failure describing why.
 */
async function ensureNotTerminal(spk_id: string): Promise<ServiceResult<true>> {
  const t = await StateEngine.isTerminal(spk_id);
  if (t.ok === false) return { ok: false, error: t.error, code: t.code };
  if (t.data) return { ok: false, error: "spk_terminal", code: "ORCH_TERMINAL" };
  return { ok: true, data: true };
}

export const SPKOrchestrator = {
  // ── Lifecycle ────────────────────────────────────────────────────────────

  create(input: CreateSpkInput): Promise<ServiceResult<SpkOrderRow>> {
    // SPKService.create already emits `spk_created` via EventService, which
    // routes through subscribers when they've been wired at bootstrap.
    return SPKService.create(input);
  },

  async update(input: UpdateSpkInput): Promise<ServiceResult<SpkOrderRow>> {
    const guard = await ensureNotTerminal(input.spk_id);
    if (guard.ok === false) return guard;
    return SPKService.update(input);
  },

  async close(spk_id: string, ctx: SpkCommandContext, workflow_code = DEFAULT_WORKFLOW) {
    return SPKService.close(spk_id, workflow_code, ctx);
  },

  async cancel(spk_id: string, reason: string, ctx: SpkCommandContext, workflow_code = DEFAULT_WORKFLOW) {
    return SPKService.cancel(spk_id, workflow_code, reason, ctx);
  },

  // ── Generic transition (used by named commands below) ────────────────────

  async transition(input: OrchestratorTransitionInput) {
    return WorkflowEngine.run({
      spk_id: input.spk_id,
      workflow_code: input.workflow_code ?? DEFAULT_WORKFLOW,
      to_status: input.to_status,
      reason: input.reason ?? null,
      ctx: input.ctx,
    });
  },

  // Named commands — thin wrappers so callers state *intent*, not raw statuses.
  startInspection: (spk_id: string, ctx: SpkCommandContext) =>
    SPKOrchestrator.transition({ spk_id, to_status: "inspection", ctx }),

  submitInspection: async (input: OrchestratorInspectionInput) => {
    const guard = await ensureNotTerminal(input.spk_id);
    if (guard.ok === false) return guard;
    return InspectionService.record(input);
  },

  startRepair: (spk_id: string, ctx: SpkCommandContext) =>
    SPKOrchestrator.transition({ spk_id, to_status: "repair", ctx }),

  finishRepair: (spk_id: string, ctx: SpkCommandContext) =>
    SPKOrchestrator.transition({ spk_id, to_status: "qc", ctx }),

  startQC: (spk_id: string, ctx: SpkCommandContext) =>
    SPKOrchestrator.transition({ spk_id, to_status: "qc", ctx }),

  finishQC: (spk_id: string, ctx: SpkCommandContext) =>
    SPKOrchestrator.transition({ spk_id, to_status: "ready_delivery", ctx }),

  deliverVehicle: (spk_id: string, ctx: SpkCommandContext) =>
    SPKOrchestrator.transition({ spk_id, to_status: "delivered", ctx }),

  // ── Approvals ────────────────────────────────────────────────────────────

  async requestApproval(input: OrchestratorRequestApprovalInput) {
    const guard = await ensureNotTerminal(input.spk_id);
    if (guard.ok === false) return guard;
    return ApprovalService.request(input);
  },

  approve: (input: OrchestratorResolveApprovalInput) => ApprovalService.approve(input),
  reject: (input: OrchestratorResolveApprovalInput) => ApprovalService.reject(input),
  escalate: (input: OrchestratorResolveApprovalInput) => ApprovalService.escalate(input),

  // ── Recommendations ──────────────────────────────────────────────────────

  async generateRecommendations(spk_id: string, ctx: SpkCommandContext) {
    const guard = await ensureNotTerminal(spk_id);
    if (guard.ok === false) return guard;
    return RecommendationService.generate({ spk_id, ctx });
  },

  // ── Freeform audit event ─────────────────────────────────────────────────
  // Escape hatch for edge cases that need to record an event without a domain
  // service. Still append-only; still fan-outs to subscribers.
  emit: EventEngine.emit,

  // ── Read helpers (no writes) ─────────────────────────────────────────────
  getStatus: StateEngine.getStatus,
  listAvailableTransitions: (spk_id: string, ctx: SpkCommandContext, workflow_code = DEFAULT_WORKFLOW) =>
    WorkflowEngine.listAvailable(spk_id, workflow_code, ctx),
};

export type SPKOrchestratorApi = typeof SPKOrchestrator;