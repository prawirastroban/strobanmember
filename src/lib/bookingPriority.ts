// Booking priority + overdue helpers (staff dashboard)
export type BookingPriority = "high" | "medium" | "normal";

const slotToMinutes = (slot: string): number => {
  // Supports "09:00 AM" / "01:00 PM" and "09:00" 24h
  const trimmed = slot.trim();
  const ampm = /am|pm/i.test(trimmed);
  if (ampm) {
    const [time, period] = trimmed.split(/\s+/);
    const [hStr, mStr] = time.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    if (/pm/i.test(period) && h !== 12) h += 12;
    if (/am/i.test(period) && h === 12) h = 0;
    return h * 60 + m;
  }
  const [hStr, mStr] = trimmed.split(":");
  return (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0);
};

/** Combine "YYYY-MM-DD" + "HH:MM AM/PM" into a Date. */
export const bookingDateTime = (dateISO: string, time: string): Date => {
  const d = new Date(dateISO);
  const mins = slotToMinutes(time);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
};

const TERMINAL = new Set(["completed", "cancelled"]);

export const getBookingPriority = (
  status: string,
  bookingDate: string,
  bookingTime: string,
  now: Date = new Date(),
): BookingPriority => {
  if (TERMINAL.has(status)) return "normal";
  const when = bookingDateTime(bookingDate, bookingTime);
  const diffMin = (when.getTime() - now.getTime()) / 60000;
  if (diffMin <= 120) return "high"; // within 2h (also overdue/past)
  const sameDay = when.toDateString() === now.toDateString();
  if (sameDay) return "medium";
  return "normal";
};

export const PRIORITY_RANK: Record<BookingPriority, number> = {
  high: 0,
  medium: 1,
  normal: 2,
};

export const PRIORITY_META: Record<
  BookingPriority,
  { label: string; badgeClass: string }
> = {
  high: {
    label: "TINGGI",
    badgeClass:
      "bg-red-500/15 text-red-500 border-red-500/40 animate-pulse",
  },
  medium: {
    label: "SEDANG",
    badgeClass: "bg-orange-500/15 text-orange-500 border-orange-500/40",
  },
  normal: {
    label: "NORMAL",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

/** Booking is "overdue" to be confirmed if waiting_confirmation > 15 min. */
export const isConfirmOverdue = (
  status: string,
  createdAt: string,
  now: Date = new Date(),
): boolean => {
  if (status !== "waiting_confirmation") return false;
  const ageMin = (now.getTime() - new Date(createdAt).getTime()) / 60000;
  return ageMin > 15;
};
