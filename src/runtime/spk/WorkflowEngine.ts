// Phase 4.3 — WorkflowEngine
// Runtime executor for status transitions. Delegates validation to WorkflowService
// (metadata-driven). Rejects illegal transitions. Emits status_changed via EventEngine.
import { WorkflowService } from "@/services/spk/WorkflowService";
import type {
  ServiceResult,
  SpkCommandContext,
  SpkStatus,
} from "@/services/spk/types";
import { StateEngine } from "./StateEngine";

export interface RunTransitionInput {
  spk_id: string;
  workflow_code: string;
  to_status: SpkStatus;
  reason?: string | null;
  ctx: SpkCommandContext;
}

export const WorkflowEngine = {
  /**
   * Execute a transition. Refuses if SPK is terminal or transition is not defined
   * for the caller role in spk_workflow_transitions.
   */
  async run(input: RunTransitionInput): Promise<ServiceResult<{ from: SpkStatus | null; to: SpkStatus }>> {
    const cur = await StateEngine.getStatus(input.spk_id);
    if (cur.ok === false) return cur;
    if (StateEngine.isTerminalStatus(cur.data)) {
      return { ok: false, error: `spk_terminal:${cur.data}`, code: "WF_TERMINAL" };
    }
    // Delegate to WorkflowService which itself emits the status_changed event.
    return WorkflowService.transition(input);
  },

  async listAvailable(
    spk_id: string,
    workflow_code: string,
    ctx: SpkCommandContext,
  ): Promise<ServiceResult<SpkStatus[]>> {
    const cur = await StateEngine.getStatus(spk_id);
    if (cur.ok === false) return cur;
    return WorkflowService.availableTransitions(workflow_code, cur.data, ctx.actor.role);
  },
};
