// Centralized "needs action" rules for admin/staff dashboards.
// Used to (a) filter rows when "Perlu Aksi" chip is active and
// (b) sort un-actioned rows to the top by default.

export type ActionScope =
  | "booking"
  | "payment"
  | "complaint"
  | "verification"
  | "tire_order";

export const isActionNeeded = (scope: ActionScope, row: any): boolean => {
  if (!row) return false;
  switch (scope) {
    case "booking":
      return (
        row.status === "pending" ||
        row.status === "waiting_confirmation" ||
        row.cancel_requested === true
      );
    case "payment":
      return (
        row.payment_status === "pending" ||
        row.payment_status === "unpaid"
      );
    case "complaint":
      return row.status === "new";
    case "verification":
      return row.is_verified === false;
    case "tire_order":
      return (
        row.status === "pending" ||
        row.payment_status === "unpaid" ||
        row.payment_status === "pending"
      );
    default:
      return false;
  }
};

/** Returns 0 for action-needed rows (sort to top), 1 otherwise. */
export const actionPriority = (scope: ActionScope, row: any): number =>
  isActionNeeded(scope, row) ? 0 : 1;

/** Shared compact badge style. */
export const ACTION_BADGE_CLASS =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border bg-red-500/15 text-red-500 border-red-500/40 animate-pulse";
