// Phase 4.2 — InspectionService
// Stores inspection results as events (append-only) and mirrors summary into
// spk_orders.data.inspection for fast reads. No UI, no SQL in caller.
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { EventService } from "./EventService";
import { fail, ok, type ServiceResult, type SpkCommandContext } from "./types";

export interface InspectionItem {
  code: string;
  label: string;
  result: "ok" | "attention" | "critical" | "na";
  note?: string | null;
  photos?: string[];
}

export interface RecordInspectionInput {
  spk_id: string;
  items: InspectionItem[];
  ctx: SpkCommandContext;
}

export const InspectionService = {
  validate(items: InspectionItem[]): ServiceResult<true> {
    if (!items.length) return fail("inspection_empty", "INSP_EMPTY");
    for (const it of items) {
      if (!it.code || !it.label) return fail("inspection_item_invalid", "INSP_ITEM");
      if (!["ok", "attention", "critical", "na"].includes(it.result)) {
        return fail(`inspection_result_invalid:${it.code}`, "INSP_RESULT");
      }
    }
    return ok(true);
  },

  async record(input: RecordInspectionInput): Promise<ServiceResult<{ event_id: string }>> {
    const v = InspectionService.validate(input.items);
    if (v.ok === false) return fail(v.error, v.code);

    // Mirror latest inspection summary into spk_orders.data for fast dashboards.
    const { data: spk } = await supabase
      .from("spk_orders")
      .select("data")
      .eq("id", input.spk_id)
      .maybeSingle();
    const nextData = { ...((spk?.data as Record<string, unknown>) ?? {}), inspection: input.items };
    await supabase.from("spk_orders").update({ data: nextData as unknown as Json }).eq("id", input.spk_id);

    const evt = await EventService.append({
      spk_id: input.spk_id,
      event_type: "inspection_recorded",
      payload: { items: input.items } as unknown as Json,
      ctx: input.ctx,
    });
    if (evt.ok === false) return fail(evt.error, evt.code);
    return ok({ event_id: evt.data.id });
  },

  /** Read the raw items from the most recent inspection event. */
  async latest(spk_id: string): Promise<ServiceResult<InspectionItem[]>> {
    const { data, error } = await supabase
      .from("spk_events")
      .select("payload")
      .eq("spk_id", spk_id)
      .eq("event_type", "inspection_recorded")
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return fail(error.message);
    const items = ((data?.payload as { items?: InspectionItem[] } | null)?.items) ?? [];
    return ok(items);
  },
};
