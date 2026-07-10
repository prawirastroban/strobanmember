// SPK Domain Refinement — Vehicle Health interpreter.
//
// Pure derivation over EXISTING SPK inspection data. Never persisted.
// Inputs are already produced by the SPK Runtime (inspection cards + notes).
//
// Categories (see plan §4):
//   NOT = 0  AND completion = 100%     → excellent
//   NOT ≤ 1  AND completion ≥ 80%      → good
//   NOT 2–3  OR  completion ≥ 60%      → needs_attention
//   NOT ≥ 4  OR  critical finding      → critical
//
// No AI, no predictions, no ML.

export type VehicleHealth = "excellent" | "good" | "needs_attention" | "critical";

export interface VehicleHealthInput {
  /** Number of inspection rows marked NOT (not OK). */
  notCount: number;
  /** Number of inspection rows marked OK. */
  okCount: number;
  /** Number of inspection rows marked NA. */
  naCount: number;
  /** Optional free-text notes from mechanic; scanned for critical keywords. */
  mechanicNotes?: string | null;
}

export interface VehicleHealthResult {
  status: VehicleHealth;
  label: string;
  /** 0–100 completion ratio across (OK + NOT); NA excluded. */
  completionPct: number;
  notCount: number;
  reason: string;
}

const CRITICAL_KEYWORDS =
  /(bocor parah|rem blong|tidak aman|bahaya|patah|retak|overheat|kritis|urgent)/i;

const LABELS: Record<VehicleHealth, string> = {
  excellent: "Excellent",
  good: "Good",
  needs_attention: "Needs Attention",
  critical: "Critical",
};

export function computeVehicleHealth(input: VehicleHealthInput): VehicleHealthResult {
  const { notCount, okCount, mechanicNotes } = input;
  const answered = okCount + notCount;
  const completionPct = answered === 0 ? 0 : Math.round((okCount / answered) * 100);
  const hasCriticalNote = !!mechanicNotes && CRITICAL_KEYWORDS.test(mechanicNotes);

  let status: VehicleHealth;
  let reason: string;

  if (notCount >= 4 || hasCriticalNote) {
    status = "critical";
    reason = hasCriticalNote
      ? "Catatan mekanik menandai kondisi kritis"
      : `${notCount} temuan bermasalah`;
  } else if (notCount >= 2 || (completionPct > 0 && completionPct < 60)) {
    status = "needs_attention";
    reason = notCount >= 2 ? `${notCount} temuan bermasalah` : "Inspeksi belum tuntas";
  } else if (notCount <= 1 && completionPct >= 80) {
    status = notCount === 0 && completionPct === 100 ? "excellent" : "good";
    reason =
      status === "excellent" ? "Semua item OK" : "Sebagian besar item OK";
  } else {
    status = "needs_attention";
    reason = "Inspeksi belum tuntas";
  }

  return { status, label: LABELS[status], completionPct, notCount, reason };
}

/** Tailwind color tokens per status (semantic classes only). */
export const VEHICLE_HEALTH_COLORS: Record<
  VehicleHealth,
  { badge: string; dot: string }
> = {
  excellent: {
    badge: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  good: {
    badge: "bg-primary/15 text-primary border-primary/30",
    dot: "bg-primary",
  },
  needs_attention: {
    badge: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    dot: "bg-amber-500",
  },
  critical: {
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    dot: "bg-destructive",
  },
};