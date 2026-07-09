// Phase 4.3 — TimelineEngine
// Runtime reader for the timeline projection. No business logic here — the
// projection itself is written by TimelineService as a side-effect of EventService.
import { TimelineService } from "@/services/spk/TimelineService";
import type { ServiceResult, SpkTimelineRow } from "@/services/spk/types";

export interface TimelineEntry {
  id: string;
  spk_id: string;
  event_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  icon: string | null;
  occurred_at: string;
  actor_role: SpkTimelineRow["actor_role"];
  actor_user_id: string | null;
  meta: SpkTimelineRow["meta"];
}

function toEntry(r: SpkTimelineRow): TimelineEntry {
  return {
    id: r.id,
    spk_id: r.spk_id,
    event_id: r.event_id,
    event_type: r.event_type,
    title: r.title,
    description: r.description,
    icon: r.icon,
    occurred_at: r.occurred_at,
    actor_role: r.actor_role,
    actor_user_id: r.actor_user_id,
    meta: r.meta,
  };
}

export const TimelineEngine = {
  async forSpk(spk_id: string): Promise<ServiceResult<TimelineEntry[]>> {
    const r = await TimelineService.listBySpk(spk_id);
    if (r.ok === false) return r;
    return { ok: true, data: r.data.map(toEntry) };
  },
};
