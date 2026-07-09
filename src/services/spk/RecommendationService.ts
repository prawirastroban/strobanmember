// Phase 4.2 — RecommendationService
// Rule-based recommendations from inspection results. No AI (yet).
// Reads InspectionService output, emits recommendation_generated event.
import type { Json } from "@/integrations/supabase/types";
import { EventService } from "./EventService";
import { InspectionService, type InspectionItem } from "./InspectionService";
import { fail, ok, type ServiceResult, type SpkCommandContext } from "./types";

export interface RecommendationRule {
  when: { code: string; result: InspectionItem["result"] };
  action: string; // e.g. "replace_brake_pads"
  label: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface Recommendation {
  action: string;
  label: string;
  priority: RecommendationRule["priority"];
  source_code: string;
}

/** Built-in defaults; production rules live in metadata (Phase 4.3+). */
const DEFAULT_RULES: RecommendationRule[] = [
  { when: { code: "brake_pad", result: "critical" }, action: "replace_brake_pads", label: "Ganti kampas rem", priority: "critical" },
  { when: { code: "brake_pad", result: "attention" }, action: "inspect_brake_pads", label: "Periksa kampas rem", priority: "medium" },
  { when: { code: "engine_oil", result: "attention" }, action: "change_engine_oil", label: "Ganti oli mesin", priority: "medium" },
  { when: { code: "tire", result: "critical" }, action: "replace_tire", label: "Ganti ban", priority: "high" },
  { when: { code: "battery", result: "critical" }, action: "replace_battery", label: "Ganti aki", priority: "high" },
];

export const RecommendationService = {
  evaluate(items: InspectionItem[], rules: RecommendationRule[] = DEFAULT_RULES): Recommendation[] {
    const out: Recommendation[] = [];
    for (const it of items) {
      for (const r of rules) {
        if (r.when.code === it.code && r.when.result === it.result) {
          out.push({ action: r.action, label: r.label, priority: r.priority, source_code: it.code });
        }
      }
    }
    return out;
  },

  async generateForSpk(
    spk_id: string,
    ctx: SpkCommandContext,
    rules?: RecommendationRule[],
  ): Promise<ServiceResult<Recommendation[]>> {
    const insp = await InspectionService.latest(spk_id);
    if (insp.ok === false) return fail(insp.error, insp.code);
    const recs = RecommendationService.evaluate(insp.data, rules);
    const evt = await EventService.append({
      spk_id,
      event_type: "recommendation_generated",
      payload: { recommendations: recs } as unknown as Json,
      ctx,
    });
    if (evt.ok === false) return fail(evt.error, evt.code);
    return ok(recs);
  },
};
