// Canonical booking status flow + UI metadata (red theme).
// Single source of truth for labels, descriptions, and colors.

export type BookingStatus =
  | "pending"
  | "waiting_confirmation"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  // Legacy values still present in DB rows; mapped to display only.
  | "checked_in"
  | "finishing"
  | "ready"
  | "installed";

export interface BookingStatusMeta {
  label: string;
  description: string;
  /** Tailwind classes for badge background + text + border (red theme accents). */
  badgeClass: string;
  /** Step index for progress (0..4). null = cancelled / unknown. */
  step: number | null;
}

export const BOOKING_STATUS_META: Record<BookingStatus, BookingStatusMeta> = {
  pending: {
    label: "Menunggu Pembayaran",
    description: "Silakan selesaikan pembayaran untuk melanjutkan booking.",
    badgeClass: "bg-muted text-muted-foreground border-border",
    step: 0,
  },
  waiting_confirmation: {
    label: "Menunggu Konfirmasi",
    description: "Pembayaran diterima. Bengkel akan konfirmasi dalam ±5–15 menit.",
    badgeClass: "bg-primary/15 text-primary border-primary/30",
    step: 1,
  },
  confirmed: {
    label: "Dikonfirmasi",
    description: "Bengkel telah mengonfirmasi booking Anda.",
    badgeClass: "bg-primary/15 text-primary border-primary/30",
    step: 2,
  },
  in_progress: {
    label: "Sedang Dikerjakan",
    description: "Kendaraan Anda sedang diservis oleh teknisi kami.",
    badgeClass: "bg-primary/20 text-primary border-primary/40",
    step: 3,
  },
  completed: {
    label: "Selesai",
    description: "Servis telah selesai. Terima kasih sudah memilih kami!",
    badgeClass: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    step: 4,
  },
  cancelled: {
    label: "Dibatalkan",
    description: "Booking ini telah dibatalkan.",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
    step: null,
  },
  // Legacy fallbacks
  checked_in: {
    label: "Check-In",
    description: "Kendaraan sudah tiba di bengkel.",
    badgeClass: "bg-primary/15 text-primary border-primary/30",
    step: 2,
  },
  finishing: {
    label: "Finishing",
    description: "Tahap akhir penyelesaian servis.",
    badgeClass: "bg-primary/20 text-primary border-primary/40",
    step: 3,
  },
  ready: {
    label: "Siap Diambil",
    description: "Pesanan siap untuk dipasang/diambil.",
    badgeClass: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    step: 3,
  },
  installed: {
    label: "Terpasang",
    description: "Telah terpasang pada kendaraan Anda.",
    badgeClass: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    step: 4,
  },
};

export const CANONICAL_STATUSES: BookingStatus[] = [
  "pending",
  "waiting_confirmation",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

export function getBookingStatusMeta(status: string): BookingStatusMeta {
  return (
    BOOKING_STATUS_META[status as BookingStatus] ?? {
      label: status,
      description: "",
      badgeClass: "bg-muted text-muted-foreground border-border",
      step: null,
    }
  );
}

/** Allowed forward transitions (excluding cancel which is allowed from any non-terminal). */
const FORWARD: Record<string, BookingStatus[]> = {
  pending: ["waiting_confirmation"],
  waiting_confirmation: ["confirmed"],
  confirmed: ["in_progress"],
  in_progress: ["completed"],
};

export function canTransition(from: string, to: BookingStatus, paymentStatus?: string): boolean {
  if (from === to) return true;
  if (to === "cancelled") return !["completed", "cancelled"].includes(from);
  if (["completed", "cancelled"].includes(from)) return false;
  const allowed = FORWARD[from] ?? [];
  if (!allowed.includes(to)) return false;
  if (to === "confirmed" && paymentStatus !== "paid") return false;
  return true;
}
