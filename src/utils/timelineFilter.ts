export type TimelinePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export interface TimelineValue {
  preset: TimelinePreset;
  startDate?: string; // ISO YYYY-MM-DD
  endDate?: string;   // ISO YYYY-MM-DD
}

export const TIMELINE_PRESETS: { value: TimelinePreset; label: string }[] = [
  { value: "today", label: "Hari Ini" },
  { value: "yesterday", label: "Kemarin" },
  { value: "this_week", label: "Minggu Ini" },
  { value: "last_week", label: "Minggu Lalu" },
  { value: "this_month", label: "Bulan Ini" },
  { value: "last_month", label: "Bulan Lalu" },
  { value: "this_quarter", label: "Kuartal Ini" },
  { value: "this_year", label: "Tahun Ini" },
  { value: "custom", label: "Custom" },
];

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOf = (
  d: Date,
  unit: "day" | "week" | "month" | "quarter" | "year",
) => {
  const r = new Date(d);
  if (unit === "day") r.setHours(0, 0, 0, 0);
  if (unit === "week") {
    const day = r.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // Monday as start
    r.setDate(r.getDate() + diff);
    r.setHours(0, 0, 0, 0);
  }
  if (unit === "month") {
    r.setDate(1);
    r.setHours(0, 0, 0, 0);
  }
  if (unit === "quarter") {
    r.setMonth(Math.floor(r.getMonth() / 3) * 3, 1);
    r.setHours(0, 0, 0, 0);
  }
  if (unit === "year") {
    r.setMonth(0, 1);
    r.setHours(0, 0, 0, 0);
  }
  return r;
};

export function getDateRange(timeline: TimelineValue): { start: string; end: string } {
  const now = new Date();
  switch (timeline.preset) {
    case "today":
      return { start: fmt(startOf(now, "day")), end: fmt(now) };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return { start: fmt(startOf(y, "day")), end: fmt(y) };
    }
    case "this_week":
      return { start: fmt(startOf(now, "week")), end: fmt(now) };
    case "last_week": {
      const lws = startOf(now, "week");
      lws.setDate(lws.getDate() - 7);
      const lwe = new Date(lws);
      lwe.setDate(lws.getDate() + 6);
      return { start: fmt(lws), end: fmt(lwe) };
    }
    case "this_month":
      return { start: fmt(startOf(now, "month")), end: fmt(now) };
    case "last_month": {
      const lms = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lme = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: fmt(lms), end: fmt(lme) };
    }
    case "this_quarter":
      return { start: fmt(startOf(now, "quarter")), end: fmt(now) };
    case "this_year":
      return { start: fmt(startOf(now, "year")), end: fmt(now) };
    case "custom":
      return {
        start: timeline.startDate ?? fmt(startOf(now, "month")),
        end: timeline.endDate ?? fmt(now),
      };
    default:
      return { start: fmt(startOf(now, "month")), end: fmt(now) };
  }
}

export const DEFAULT_TIMELINE: TimelineValue = { preset: "this_month" };

export function isTimelineDefault(t: TimelineValue, def: TimelineValue = DEFAULT_TIMELINE) {
  if (t.preset !== def.preset) return false;
  if (t.preset === "custom") {
    return t.startDate === def.startDate && t.endDate === def.endDate;
  }
  return true;
}