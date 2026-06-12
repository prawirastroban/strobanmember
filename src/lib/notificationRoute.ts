// Shared resolver for notification → route deep-link.
// Used by both NotificationBell (in-app) and push handlers (native/web).

export type NotificationLike = {
  type?: string | null;
  metadata?: Record<string, any> | null;
};

export function resolveNotificationRoute(
  n: NotificationLike,
  isStaffSide: boolean,
): string {
  if (n.metadata?.redirect_to) return String(n.metadata.redirect_to);
  const id = n.metadata?.reference_id;
  const type = n.type ?? "";

  if (isStaffSide) {
    if (type === "new_registration" && n.metadata?.registered_user_id) {
      return `/dashboard/customers/${n.metadata.registered_user_id}`;
    }
    if ((type === "booking" || type === "booking_created") && n.metadata?.customer_user_id) {
      return `/dashboard/customers/${n.metadata.customer_user_id}`;
    }
    if (type === "booking" || type === "booking_created") return "/dashboard/bookings";
    if (type === "new_registration") return "/dashboard/customers";
    if (type === "cancel_request") return "/dashboard/bookings";
    if (type === "tire_order") return "/dashboard/bookings";
    if (type === "payment") return "/dashboard/payments";
    if (type === "referral") return "/dashboard/users";
    if (type === "promo_used") return "/dashboard/marketing/promos";
    if (type === "reward_used") return "/dashboard/marketing";
    if (type === "bug_report") return "/dashboard/feedback";
  }

  switch (type) {
    case "payment_success":
    case "payment": return "/profile/history-perawatan";
    case "booking_created":
    case "booking": return "/profile/history-perawatan";
    case "service_progress": return "/";
    case "invoice_ready": return id ? `/invoice/${id}` : "/profile/history-perawatan";
    case "verification": return "/";
    case "cancel_rejected":
    case "cancel_request": return "/profile/history-perawatan";
    case "tire_order": return "/profile/history-perawatan";
    case "referral": return "/referral";
    case "new_registration": return "/dashboard/customers";
    case "promo_used": return "/promo";
    case "reward_used": return "/loyalty";
    case "referral_commission": return "/referral";
    default: return "/";
  }
}