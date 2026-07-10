// SPK Intelligence Suite — Service Reminder derivation.
//
// Uses EXISTING data only: previous service date (closed_at of last SPK for the
// vehicle), mileage (from spk_orders.data), and a fixed service interval.
// No new engine, no additional tables.

const DEFAULT_INTERVAL_DAYS = 90;
const DEFAULT_INTERVAL_KM = 5000;

export interface ReminderInput {
  lastServiceAt: string | null;       // ISO
  lastMileage: number | null;         // km at last service
  currentMileage?: number | null;     // if known (else same as last)
  intervalDays?: number;
  intervalKm?: number;
}

export interface ReminderResult {
  nextDueDate: string | null;         // ISO date
  daysUntilDue: number | null;
  kmUntilDue: number | null;
  status: "on_track" | "due_soon" | "overdue" | "unknown";
  reason: string;
}

export function computeServiceReminder(input: ReminderInput): ReminderResult {
  const intervalDays = input.intervalDays ?? DEFAULT_INTERVAL_DAYS;
  const intervalKm = input.intervalKm ?? DEFAULT_INTERVAL_KM;

  if (!input.lastServiceAt) {
    return {
      nextDueDate: null,
      daysUntilDue: null,
      kmUntilDue: null,
      status: "unknown",
      reason: "Belum ada riwayat servis",
    };
  }
  const last = new Date(input.lastServiceAt);
  const due = new Date(last.getTime() + intervalDays * 86400000);
  const daysUntilDue = Math.round((due.getTime() - Date.now()) / 86400000);

  const cm = input.currentMileage ?? input.lastMileage ?? null;
  const kmUntilDue =
    input.lastMileage != null && cm != null
      ? intervalKm - Math.max(0, cm - input.lastMileage)
      : null;

  let status: ReminderResult["status"];
  let reason: string;
  if (daysUntilDue < 0 || (kmUntilDue != null && kmUntilDue <= 0)) {
    status = "overdue";
    reason = daysUntilDue < 0
      ? `Terlambat ${Math.abs(daysUntilDue)} hari`
      : `Melewati batas ${intervalKm} km`;
  } else if (daysUntilDue <= 14 || (kmUntilDue != null && kmUntilDue <= 500)) {
    status = "due_soon";
    reason = `Jatuh tempo dalam ${daysUntilDue} hari`;
  } else {
    status = "on_track";
    reason = `Servis berikutnya ~${daysUntilDue} hari lagi`;
  }
  return {
    nextDueDate: due.toISOString(),
    daysUntilDue,
    kmUntilDue,
    status,
    reason,
  };
}

export const REMINDER_COLORS: Record<ReminderResult["status"], string> = {
  on_track: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  due_soon: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  unknown: "bg-muted text-muted-foreground border-border",
};
