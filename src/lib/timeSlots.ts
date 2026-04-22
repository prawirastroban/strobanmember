// Shared time-slot utilities to keep booking time options
// in sync with the user's live local time.
//
// If the selected date is today, slots earlier than the current
// time (plus a small buffer) must be hidden everywhere.

const BUFFER_MINUTES = 30;

/** Parse a slot like "08:00", "09:30", or "01:00 PM" into minutes since midnight. */
export function slotToMinutes(slot: string): number {
  const s = slot.trim().toUpperCase();
  const ampmMatch = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3];
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  const [hh, mm] = s.split(":");
  return (parseInt(hh, 10) || 0) * 60 + (parseInt(mm, 10) || 0);
}

/** True when `date` is the same calendar day as `now` (local time). */
export function isSameLocalDay(date: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date.includes("T") ? date : `${date}T00:00:00`) : date;
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Filter time-slots for a target date. If the target date is today,
 * any slot earlier than `now + buffer` is removed. Other days return
 * the full list unchanged.
 */
export function filterFutureSlots<T extends string>(
  slots: readonly T[],
  date: Date | string | null | undefined,
  now: Date = new Date(),
  bufferMinutes: number = BUFFER_MINUTES,
): T[] {
  if (!date) return [...slots];
  if (!isSameLocalDay(date, now)) return [...slots];
  const cutoff = now.getHours() * 60 + now.getMinutes() + bufferMinutes;
  return slots.filter((s) => slotToMinutes(s) >= cutoff);
}

/** React-friendly hook: returns a `Date` updated every `intervalMs`. */
export const TIME_TICK_MS = 60_000;