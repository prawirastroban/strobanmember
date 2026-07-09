// Phase 5.9 — RuntimeBus
// Lightweight in-process pub/sub used by AutomationEngine to fan out
// operational signals (runtime-refresh, queue-refresh, notification-trigger,
// …) toward interested UI hooks — without the UI ever calling automation
// directly. Framework-agnostic: React subscribes through hooks, but the bus
// itself only speaks JS.
//
// Contract:
//   • `publish(topic, payload)` — invoked by AutomationEngine handlers.
//   • `subscribe(topic, listener)` — returns an unsubscribe fn.
//   • Never awaited by publishers; listeners must not throw (bus swallows).
//
// Topics are string-typed on purpose so future handlers can extend without
// coordinating with existing subscribers.

export type RuntimeBusTopic =
  | "runtime-refresh" // { spk_id, event_type, to_status? }
  | "queue-refresh" // { spk_id?, event_type }
  | "progress-refresh" // { spk_id, event_type }
  | "notification-trigger" // { spk_id, event_type, payload }
  | "timeline-refresh"; // { spk_id, event_type }

export interface RuntimeBusPayload {
  spk_id: string;
  event_type: string;
  to_status?: string | null;
  correlation_id?: string | null;
  extra?: Record<string, unknown>;
}

type Listener = (payload: RuntimeBusPayload) => void;

const listeners = new Map<RuntimeBusTopic, Set<Listener>>();

export const RuntimeBus = {
  subscribe(topic: RuntimeBusTopic, fn: Listener): () => void {
    let set = listeners.get(topic);
    if (!set) {
      set = new Set();
      listeners.set(topic, set);
    }
    set.add(fn);
    return () => set!.delete(fn);
  },

  publish(topic: RuntimeBusTopic, payload: RuntimeBusPayload): void {
    const set = listeners.get(topic);
    if (!set || set.size === 0) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        // Bus must never let a bad listener kill the fan-out.
        console.error(`[RuntimeBus] listener for "${topic}" failed`, err);
      }
    }
  },

  _sizeForTest: (topic: RuntimeBusTopic) => listeners.get(topic)?.size ?? 0,
  _clearForTest: () => listeners.clear(),
};