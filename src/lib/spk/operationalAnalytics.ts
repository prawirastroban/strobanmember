// SPK Intelligence Suite — Operational Analytics.
//
// Pure derivations over EXISTING spk_events. Never writes. Never persists.
// Reuses spk_events as the single source of truth for durations & KPIs.

import { eventToStage, type OperationalStage } from "./eventLabels";

export interface RawEvent {
  spk_id: string;
  event_type: string;
  occurred_at: string;
  payload?: unknown;
  actor_user_id?: string | null;
  actor_role?: string | null;
}

export interface StageStamp {
  stage: OperationalStage;
  at: string;
}

/** Reduce an SPK's events to first-seen timestamp per stage. */
export function stageStamps(events: RawEvent[]): Partial<Record<OperationalStage, string>> {
  const out: Partial<Record<OperationalStage, string>> = {};
  for (const e of events) {
    const st = eventToStage(e);
    if (!out[st]) out[st] = e.occurred_at;
  }
  return out;
}

/** Milliseconds between two ISO stamps (null-safe). */
function diffMs(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const d = new Date(b).getTime() - new Date(a).getTime();
  return isFinite(d) && d >= 0 ? d : null;
}

export interface DurationBreakdown {
  waitingMs: number | null;      // created → repair_started
  inspectionMs: number | null;   // created → inspection_completed
  repairMs: number | null;       // repair_started → work_completed
  qcMs: number | null;           // waiting_qc → qc_approved
  leadTimeMs: number | null;     // created → closed
  completionMs: number | null;   // repair_started → closed
}

export function durationsFor(events: RawEvent[]): DurationBreakdown {
  const s = stageStamps(events);
  return {
    waitingMs:    diffMs(s.spk_created, s.repair_started),
    inspectionMs: diffMs(s.spk_created, s.inspection_completed),
    repairMs:     diffMs(s.repair_started, s.work_completed),
    qcMs:         diffMs(s.waiting_qc, s.qc_approved),
    leadTimeMs:   diffMs(s.spk_created, s.spk_closed),
    completionMs: diffMs(s.repair_started, s.spk_closed),
  };
}

/** Aggregate durations across many SPKs. Ignores nulls. */
export function aggregateDurations(list: DurationBreakdown[]) {
  const keys: (keyof DurationBreakdown)[] = [
    "waitingMs", "inspectionMs", "repairMs", "qcMs", "leadTimeMs", "completionMs",
  ];
  const out: Record<string, { avg: number | null; count: number; total: number }> = {};
  for (const k of keys) {
    const vals = list.map((d) => d[k]).filter((v): v is number => v != null);
    const total = vals.reduce((a, b) => a + b, 0);
    out[k] = {
      avg: vals.length ? Math.round(total / vals.length) : null,
      count: vals.length,
      total,
    };
  }
  return out;
}

export function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} d`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return `${h}j ${rm}m`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return `${d}h ${rh}j`;
}

/** Group events by actor_user_id and count completed jobs (work_completed or qc_approved). */
export function productivityByActor(
  events: RawEvent[],
  stage: OperationalStage,
): { actor_user_id: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (const e of events) {
    if (!e.actor_user_id) continue;
    if (eventToStage(e) === stage) {
      buckets.set(e.actor_user_id, (buckets.get(e.actor_user_id) ?? 0) + 1);
    }
  }
  return [...buckets.entries()]
    .map(([actor_user_id, count]) => ({ actor_user_id, count }))
    .sort((a, b) => b.count - a.count);
}

/** Simple SLA classifier over lead time. */
export function slaLevel(leadMs: number | null, targetHours = 24): "ok" | "warn" | "breach" | "unknown" {
  if (leadMs == null) return "unknown";
  const h = leadMs / 3_600_000;
  if (h <= targetHours * 0.7) return "ok";
  if (h <= targetHours) return "warn";
  return "breach";
}
