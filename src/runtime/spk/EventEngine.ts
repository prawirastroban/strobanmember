// Phase 4.3 — EventEngine
// Runtime facade over EventService. Adds correlation_id generation, subscriber
// dispatch (Timeline/Analytics/Notification/AI hooks), and a single entry point
// for all runtime actions. Knows nothing about React/UI.
import { EventService } from "@/services/spk/EventService";
import type { Json } from "@/integrations/supabase/types";
import type {
  ServiceResult,
  SpkCommandContext,
  SpkEventRow,
} from "@/services/spk/types";

export type EventSubscriber = (evt: SpkEventRow) => Promise<void> | void;

const subscribers = new Set<EventSubscriber>();

/** Generate an RFC4122-ish correlation id without pulling a dependency. */
function newCorrelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `corr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface EmitInput {
  spk_id: string;
  event_type: string;
  payload?: Json;
  ctx: SpkCommandContext;
}

export const EventEngine = {
  /** Register a runtime subscriber. Returns an unsubscribe fn. */
  subscribe(fn: EventSubscriber): () => void {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },

  /** Append an event and fan-out to subscribers. Subscribers never block persistence. */
  async emit(input: EmitInput): Promise<ServiceResult<SpkEventRow>> {
    const ctx: SpkCommandContext = {
      ...input.ctx,
      correlation_id: input.ctx.correlation_id ?? newCorrelationId(),
      occurred_at: input.ctx.occurred_at ?? new Date().toISOString(),
    };
    const result = await EventService.append({
      spk_id: input.spk_id,
      event_type: input.event_type,
      payload: input.payload,
      ctx,
    });
    if (result.ok === false) return result;
    // Fan-out; each subscriber isolated so one failure doesn't cascade.
    await Promise.all(
      Array.from(subscribers).map(async (s) => {
        try {
          await s(result.data);
        } catch (err) {
          console.error("[EventEngine] subscriber failed", err);
        }
      }),
    );
    return result;
  },

  _subscribersSize: () => subscribers.size,
  _clearSubscribersForTest: () => subscribers.clear(),
};
