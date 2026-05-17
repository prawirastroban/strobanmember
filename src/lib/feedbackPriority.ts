export type Priority = "kritis" | "tinggi" | "sedang" | "rendah";

export const PRIORITY_META: Record<Priority, { label: string; className: string; rank: number }> = {
  kritis: { label: "KRITIS", className: "bg-red-500/15 text-red-400 border-red-500/40 shadow-[0_0_12px_-2px_rgba(255,43,43,0.55)]", rank: 4 },
  tinggi: { label: "TINGGI", className: "bg-amber-500/15 text-amber-400 border-amber-500/40", rank: 3 },
  sedang: { label: "SEDANG", className: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30", rank: 2 },
  rendah: { label: "RENDAH", className: "bg-muted/30 text-muted-foreground border-border", rank: 1 },
};

export type FeedbackSource =
  | "complaint"
  | "internal"
  | "payment"
  | "booking"
  | "review"
  | "auto";

export type FeedbackTab = "urgent" | "customer" | "operasional" | "saran";

export type UnifiedItem = {
  id: string;
  source: FeedbackSource;
  title: string;
  subtitle?: string;
  customerName?: string | null;
  branch?: string | null;
  category: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  priority: Priority;
  priorityScore: number;
  bookingId?: string | null;
  paymentId?: string | null;
  userId?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  raw: any;
  tab: FeedbackTab;
};

const ageBonus = (createdAt: string) => {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 36e5;
  if (hours < 1) return 0;
  if (hours > 72) return 20;
  return Math.round((hours / 72) * 20);
};

export function scoreComplaint(c: any, repeatCount = 1): UnifiedItem {
  const isMoneyCat = ["pembayaran", "kerusakan", "billing", "refund"].some((k) =>
    (c.category || "").toLowerCase().includes(k),
  );
  let priority: Priority = "sedang";
  let score = 50;
  if (c.status === "resolved") { priority = "rendah"; score = 10; }
  else if (isMoneyCat && c.status === "new") { priority = "kritis"; score = 90; }
  else if (repeatCount >= 2) { priority = "tinggi"; score = 70; }
  score += ageBonus(c.created_at);
  return {
    id: `complaint:${c.id}`,
    source: "complaint",
    title: c.message?.slice(0, 90) || "Keluhan customer",
    customerName: c.name,
    branch: null,
    category: c.category || "umum",
    status: c.status,
    statusLabel: c.status === "new" ? "Baru" : c.status === "in_progress" ? "Diproses" : "Selesai",
    createdAt: c.created_at,
    priority, priorityScore: score,
    userId: c.user_id,
    description: c.message,
    raw: c,
    tab: "customer",
  };
}

export function scoreInternal(r: any): UnifiedItem {
  let priority: Priority = "sedang";
  let score = 40;
  if (r.status === "fixed") { priority = "rendah"; score = 5; }
  else if (r.category === "bug" && r.status === "open") { priority = "tinggi"; score = 65; }
  else if (r.category === "masukan") { priority = "rendah"; score = 20; }
  score += ageBonus(r.created_at);
  return {
    id: `internal:${r.id}`,
    source: "internal",
    title: r.title,
    customerName: r.reporter_name,
    branch: null,
    category: r.category,
    status: r.status,
    statusLabel: r.status === "open" ? "Baru" : r.status === "in_progress" ? "Investigasi" : "Selesai",
    createdAt: r.created_at,
    priority, priorityScore: score,
    imageUrl: r.image_url,
    description: r.description,
    raw: r,
    tab: r.category === "masukan" ? "saran" : "operasional",
  };
}

export function scoreReview(rv: any): UnifiedItem {
  const bad = (rv.rating ?? 5) <= 2;
  return {
    id: `review:${rv.id}`,
    source: "review",
    title: `Rating ${rv.rating}★ — ${rv.review_text?.slice(0, 80) || "Tanpa komentar"}`,
    customerName: null,
    branch: null,
    category: "review",
    status: rv.follow_up_status || "completed",
    statusLabel: rv.follow_up_status === "completed" ? "Selesai" : "Perlu Follow-up",
    createdAt: rv.created_at,
    priority: bad ? "tinggi" : "rendah",
    priorityScore: (bad ? 75 : 15) + ageBonus(rv.created_at),
    bookingId: rv.booking_id,
    userId: rv.user_id,
    description: rv.review_text,
    raw: rv,
    tab: "customer",
  };
}

export function scorePaymentAnomaly(p: any): UnifiedItem | null {
  const ageH = (Date.now() - new Date(p.created_at).getTime()) / 36e5;
  if (p.payment_status === "success" || p.payment_status === "paid") return null;
  if (ageH < 24 && p.payment_status === "pending") return null;
  let priority: Priority = "tinggi";
  let score = 80;
  if (p.payment_status === "pending" && ageH >= 24) { priority = "kritis"; score = 100; }
  if (p.payment_status === "failure" || p.payment_status === "failed") { priority = "kritis"; score = 95; }
  return {
    id: `payment:${p.id}`,
    source: "payment",
    title: `Pembayaran ${p.payment_status} — ${Math.round(ageH)}j`,
    subtitle: `Order ${p.midtrans_order_id || p.id.slice(0, 8)}`,
    branch: null,
    category: "pembayaran",
    status: p.payment_status,
    statusLabel: p.payment_status,
    createdAt: p.created_at,
    priority, priorityScore: score,
    paymentId: p.id,
    bookingId: p.booking_id,
    userId: p.user_id,
    raw: p,
    tab: "urgent",
  };
}

export function scoreBookingStuck(b: any): UnifiedItem | null {
  if (["completed", "cancelled", "done"].includes(b.status)) return null;
  const ageH = (Date.now() - new Date(b.updated_at).getTime()) / 36e5;
  if (ageH < 48) return null;
  return {
    id: `booking:${b.id}`,
    source: "booking",
    title: `Booking stuck di "${b.status}" (${Math.round(ageH)}j)`,
    subtitle: `${b.service_name} · ${b.customer_name}`,
    customerName: b.customer_name,
    branch: b.branch,
    category: "booking",
    status: b.status,
    statusLabel: b.status,
    createdAt: b.updated_at,
    priority: "kritis",
    priorityScore: 95,
    bookingId: b.id,
    userId: b.user_id,
    raw: b,
    tab: "urgent",
  };
}

export function sortByPriority(items: UnifiedItem[]): UnifiedItem[] {
  return [...items].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}