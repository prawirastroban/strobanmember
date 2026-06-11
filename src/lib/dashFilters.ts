/**
 * Global dashboard filter — URL-driven, single source of truth.
 * All connected dashboards read and write through this module so a filter
 * set on /dashboard/finance is honored by /dashboard/history and vice versa.
 */
export type DashFilterKey =
  | "date_preset"
  | "date_from"
  | "date_to"
  | "branch"
  | "customer"        // free-text search (name/phone/plate)
  | "vehicle"
  | "promo"           // promo id or code
  | "loyalty"         // earn | redeem
  | "referral"        // status
  | "booking_status"
  | "payment_status"
  | "payment_method"
  | "tab";            // for HistoryHub

export type DashFilters = Partial<Record<DashFilterKey, string>>;

const KEYS: DashFilterKey[] = [
  "date_preset","date_from","date_to","branch","customer","vehicle",
  "promo","loyalty","referral","booking_status","payment_status","payment_method","tab",
];

/** Read current filters from a URLSearchParams. */
export function readFilters(sp: URLSearchParams): DashFilters {
  const out: DashFilters = {};
  KEYS.forEach((k) => {
    const v = sp.get(k);
    if (v && v !== "all") out[k] = v;
  });
  return out;
}

/** Merge & write filters back to URLSearchParams (mutates a copy). */
export function writeFilters(
  sp: URLSearchParams,
  patch: DashFilters,
): URLSearchParams {
  const next = new URLSearchParams(sp);
  Object.entries(patch).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || v === "all") {
      next.delete(k);
    } else {
      next.set(k, String(v));
    }
  });
  return next;
}

/** Build an absolute href to another dashboard route, carrying current filters
 *  plus overrides. Used by DrillCard / DrillBadge. */
export function buildHref(
  pathname: string,
  currentFilters: DashFilters,
  overrides: DashFilters = {},
): string {
  const sp = new URLSearchParams();
  const merged: DashFilters = { ...currentFilters, ...overrides };
  Object.entries(merged).forEach(([k, v]) => {
    if (v && v !== "all") sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Reset everything except the given keys (e.g. keep `tab` on HistoryHub). */
export function clearFilters(
  sp: URLSearchParams,
  keep: DashFilterKey[] = [],
): URLSearchParams {
  const next = new URLSearchParams();
  keep.forEach((k) => {
    const v = sp.get(k);
    if (v) next.set(k, v);
  });
  return next;
}

/** Count how many filters are active (excluding `tab`). */
export function countActive(filters: DashFilters): number {
  return Object.entries(filters).filter(([k, v]) => k !== "tab" && !!v).length;
}