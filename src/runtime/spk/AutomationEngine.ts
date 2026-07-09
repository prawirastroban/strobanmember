// Phase 4.3 — AutomationEngine
// Orchestrates side-effects after an event: Timeline (already done via EventService),
// Analytics bump, Notification hook (no impl), AI hook (no impl). Extensible via
// register() for future modules. UI-agnostic.
import { AnalyticsService } from "@/services/spk/AnalyticsService";
import type { SpkEventRow } from "@/services/spk/types";
import { EventEngine, type EventSubscriber } from "./EventEngine";

export type AutomationHandler = (evt: SpkEventRow) => Promise<void> | void;

interface Registration {
  name: string;
  handler: AutomationHandler;
  match?: (evt: SpkEventRow) => boolean;
}

const registry: Registration[] = [];

function toBucketDate(iso: string): string {
  return iso.slice(0, 10);
}

// ── Built-in handlers ────────────────────────────────────────────────────────

const analyticsHandler: AutomationHandler = async (evt) => {
  const code = AnalyticsService.metricCodeFor(evt.event_type);
  if (!code) return;
  // Best-effort read of branch_id from payload for scoping (falls back to null).
  const payload = (evt.payload ?? {}) as Record<string, unknown>;
  const branch_id = (payload.branch_id as string | null) ?? null;
  await AnalyticsService.bump({
    branch_id,
    bucket_date: toBucketDate(evt.occurred_at),
    metric_code: code,
    delta: 1,
  });
};

/** Notification hook — intentionally empty. UI/Notification impl arrives in a later phase. */
const notificationHook: AutomationHandler = async (_evt) => {
  // no-op: real dispatch wired later without touching runtime contracts.
};

/** AI hook — intentionally empty. Feature reader arrives in Phase 4.5+ per §90 stage 11. */
const aiHook: AutomationHandler = async (_evt) => {
  // no-op
};

// ── Public API ───────────────────────────────────────────────────────────────

export const AutomationEngine = {
  /** Register a custom handler. Optionally filter with `match`. */
  register(reg: Registration): () => void {
    registry.push(reg);
    return () => {
      const idx = registry.findIndex((r) => r === reg);
      if (idx >= 0) registry.splice(idx, 1);
    };
  },

  /** Wire built-in handlers into EventEngine. Idempotent — safe to call once at bootstrap. */
  start(): () => void {
    // Timeline projection is already handled inside EventService.append().
    const subscribers: EventSubscriber[] = [
      analyticsHandler,
      notificationHook,
      aiHook,
      async (evt) => {
        for (const r of registry) {
          if (r.match && !r.match(evt)) continue;
          try {
            await r.handler(evt);
          } catch (err) {
            console.error(`[AutomationEngine] handler "${r.name}" failed`, err);
          }
        }
      },
    ];
    const unsubs = subscribers.map((s) => EventEngine.subscribe(s));
    return () => unsubs.forEach((u) => u());
  },

  _registryForTest: () => registry,
};
