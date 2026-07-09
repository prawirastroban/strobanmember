// Phase 4.3 — StateEngine
// Single source of truth for the runtime status of an SPK. Reads spk_orders.
// No writes — mutations happen via WorkflowEngine only.
import { SPKService } from "@/services/spk/SPKService";
import { fail, ok, type ServiceResult, type SpkStatus } from "@/services/spk/types";

const TERMINAL: SpkStatus[] = ["closed", "cancelled"];

export const StateEngine = {
  async getStatus(spk_id: string): Promise<ServiceResult<SpkStatus>> {
    const r = await SPKService.getById(spk_id);
    if (r.ok === false) return fail(r.error, r.code);
    if (!r.data) return fail("spk_not_found", "SPK_MISSING");
    return ok(r.data.status as SpkStatus);
  },

  async isInStatus(spk_id: string, statuses: SpkStatus[]): Promise<ServiceResult<boolean>> {
    const s = await StateEngine.getStatus(spk_id);
    if (s.ok === false) return fail(s.error, s.code);
    return ok(statuses.includes(s.data));
  },

  async isTerminal(spk_id: string): Promise<ServiceResult<boolean>> {
    return StateEngine.isInStatus(spk_id, TERMINAL);
  },

  isTerminalStatus(status: SpkStatus): boolean {
    return TERMINAL.includes(status);
  },
};
