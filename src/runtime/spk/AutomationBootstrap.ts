// Phase 5.9 — Automation Engine Integration
//
// Bootstraps the existing AutomationEngine at app startup and registers the
// operational side-effect handlers required by Phase 5.9:
//
//     WorkflowEngine → EventEngine → AutomationEngine → RuntimeBus → Canvas
//
// Responsibilities of each built-in handler (all event-driven, never called
// by Canvas directly):
//
//   • timeline-refresh     Signals UI that the SPK timeline projection was
//                          updated (Timeline row was already persisted by
//                          EventService.append — this is a pure UI signal).
//   • progress-refresh     Signals UI that the SPK progress/completion state
//                          may have changed (fires on status transitions
//                          and inspection/approval events).
//   • queue-refresh        Signals the Work Queue view to re-fetch (fires on
//                          status transitions and lifecycle events).
//   • runtime-refresh      Generic "reload runtime bindings for this SPK".
//                          Used by useSPKWorkflow to auto-refresh available
//                          transitions after a workflow hop from any tab.
//   • notification-trigger Emits a bus payload only — real dispatch stays
//                          out of runtime per §90 (Notification hook in
//                          AutomationEngine is intentionally empty).
//
// This module MUST be imported exactly once from the app entry (main.tsx).
// The bootstrap function is idempotent so multiple imports are safe.

import { AutomationEngine } from "./AutomationEngine";
import { RuntimeBus } from "./RuntimeBus";
import type { SpkEventRow } from "@/services/spk/types";

let started = false;
let disposer: (() => void) | null = null;

/** Coerce a persisted SpkEventRow into a RuntimeBus payload. */
function toBusPayload(evt: SpkEventRow): {
  spk_id: string;
  event_type: string;
  to_status: string | null;
  correlation_id: string | null;
  extra: Record<string, unknown>;
} {
  const payload = (evt.payload ?? {}) as Record<string, unknown>;
  const to_status = (payload.to as string | undefined) ?? null;
  return {
    spk_id: evt.spk_id,
    event_type: evt.event_type,
    to_status,
    correlation_id: evt.correlation_id ?? null,
    extra: payload,
  };
}

/**
 * Events that count as "operational progress" — any of them should refresh
 * the SPK's active runtime bindings (status, allowed transitions, progress).
 */
const PROGRESS_EVENTS = new Set<string>([
  "status_changed",
  "inspection_recorded",
  "approval_requested",
  "approval_approved",
  "approval_rejected",
  "approval_escalated",
  "spk_created",
  "spk_updated",
  "spk_closed",
  "spk_cancelled",
]);

/**
 * Events that should refresh the Work Queue listing.
 */
const QUEUE_EVENTS = new Set<string>([
  "status_changed",
  "spk_created",
  "spk_closed",
  "spk_cancelled",
]);

/**
 * Wire built-in AutomationEngine handlers. Safe to call multiple times —
 * subsequent calls are no-ops until `disposeAutomation()` is called.
 */
export function bootstrapAutomation(): () => void {
  if (started) return disposer ?? (() => {});
  started = true;

  // The core AutomationEngine already fans out to Analytics/Notification/AI
  // hooks. We start it and layer our RuntimeBus publishers on top via
  // register() so all Phase 5.9 side-effects live in one place.
  const stopCore = AutomationEngine.start();

  const unregs: Array<() => void> = [];

  unregs.push(
    AutomationEngine.register({
      name: "runtime-refresh",
      handler: (evt) => {
        if (!PROGRESS_EVENTS.has(evt.event_type)) return;
        RuntimeBus.publish("runtime-refresh", toBusPayload(evt));
      },
    }),
  );

  unregs.push(
    AutomationEngine.register({
      name: "progress-refresh",
      handler: (evt) => {
        if (!PROGRESS_EVENTS.has(evt.event_type)) return;
        RuntimeBus.publish("progress-refresh", toBusPayload(evt));
      },
    }),
  );

  unregs.push(
    AutomationEngine.register({
      name: "queue-refresh",
      handler: (evt) => {
        if (!QUEUE_EVENTS.has(evt.event_type)) return;
        RuntimeBus.publish("queue-refresh", toBusPayload(evt));
      },
    }),
  );

  unregs.push(
    AutomationEngine.register({
      name: "timeline-refresh",
      handler: (evt) => {
        // Every persisted event enriches the timeline projection.
        RuntimeBus.publish("timeline-refresh", toBusPayload(evt));
      },
    }),
  );

  unregs.push(
    AutomationEngine.register({
      name: "notification-trigger",
      handler: (evt) => {
        // Runtime-side stub: broadcast the intent only. Real transport
        // (WhatsApp/Push/Email) is wired in the Notification phase.
        if (evt.event_type !== "status_changed") return;
        RuntimeBus.publish("notification-trigger", toBusPayload(evt));
      },
    }),
  );

  disposer = () => {
    unregs.forEach((u) => u());
    stopCore();
    started = false;
    disposer = null;
  };
  return disposer;
}

/** Test/dev helper to tear down the bootstrap. */
export function disposeAutomation(): void {
  disposer?.();
}

// Side-effect: bootstrap on first import. main.tsx imports this module which
// wires the handlers before any Canvas or WorkQueue mounts.
bootstrapAutomation();