import { supabase } from "@/integrations/supabase/client";
import type { ReportDefinition, CategoryMeta } from "./types";

// ---------- Helpers ----------
const groupBy = <T,>(arr: T[], key: (x: T) => string): Record<string, T[]> =>
  arr.reduce((acc, item) => {
    const k = key(item) || "-";
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);

const dayKey = (iso: string) => (iso || "").slice(0, 10);

// Apply optional branch filter on a Supabase query builder
const withBranch = (q: any, branch?: string | null) =>
  branch && branch !== "all" ? q.eq("branch", branch) : q;

// ---------- Categories ----------
export const CATEGORIES: CategoryMeta[] = [
  { id: "sales", label: "Penjualan & Booking", description: "Ringkasan booking, layanan, dan konversi", icon: "ShoppingBag" },
  { id: "finance", label: "Keuangan", description: "Pendapatan, piutang, dan margin", icon: "Wallet", sensitive: true },
  { id: "payments", label: "Pembayaran", description: "Transaksi, metode bayar, dan webhook", icon: "CreditCard", sensitive: true },
  { id: "customers", label: "Pelanggan (CRM)", description: "Customer baru, top spender, retensi", icon: "Users" },
  { id: "vehicles", label: "Kendaraan & Servis", description: "Daftar kendaraan, brand, dan keluhan", icon: "Car" },
  { id: "loyalty", label: "Loyalty & Rewards", description: "Poin earned, redeemed, top member", icon: "Trophy" },
  { id: "promos", label: "Promo & Voucher", description: "Performa promo dan voucher", icon: "Tag" },
  { id: "operations", label: "Operasional Cabang", description: "Slot, durasi servis, performa cabang", icon: "Building2" },
  { id: "response", label: "Respon Rate Admin", description: "Waktu respon admin cabang & CS pusat per aksi booking", icon: "Timer" },
];

export const getCategory = (id: string) => CATEGORIES.find((c) => c.id === id);

// ---------- Reports ----------
export const REPORTS: ReportDefinition[] = [
  // ===== SALES =====
  {
    id: "sales-summary",
    category: "sales",
    title: "Ringkasan Booking Harian",
    description: "Jumlah booking dan nilai per tanggal",
    columns: [
      { key: "date", label: "Tanggal", format: "date" },
      { key: "total", label: "Jumlah Booking", format: "number", align: "right", total: true },
      { key: "completed", label: "Selesai", format: "number", align: "right", total: true },
      { key: "cancelled", label: "Batal", format: "number", align: "right", total: true },
      { key: "revenue", label: "Nilai (Rp)", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("booking_date, status, service_price, branch")
        .gte("booking_date", start).lte("booking_date", end);
      q = withBranch(q, branch);
      const { data } = await q;
      const grp = groupBy(data || [], (r: any) => r.booking_date);
      return Object.entries(grp).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
        date,
        total: items.length,
        completed: items.filter((r: any) => r.status === "completed").length,
        cancelled: items.filter((r: any) => r.status === "cancelled").length,
        revenue: items.filter((r: any) => r.status === "completed")
          .reduce((s: number, r: any) => s + Number(r.service_price || 0), 0),
      }));
    },
    kpis: (rows) => {
      const total = rows.reduce((s, r) => s + (r.total || 0), 0);
      const completed = rows.reduce((s, r) => s + (r.completed || 0), 0);
      const cancelled = rows.reduce((s, r) => s + (r.cancelled || 0), 0);
      const revenue = rows.reduce((s, r) => s + (r.revenue || 0), 0);
      return [
        { label: "Total Booking", value: total.toLocaleString("id-ID") },
        { label: "Selesai", value: completed.toLocaleString("id-ID") },
        { label: "Batal", value: cancelled.toLocaleString("id-ID") },
        { label: "Total Revenue", value: `Rp ${revenue.toLocaleString("id-ID")}` },
      ];
    },
  },
  {
    id: "sales-by-service",
    category: "sales",
    title: "Booking per Layanan",
    description: "Performa tiap layanan: qty & revenue",
    columns: [
      { key: "service_name", label: "Layanan" },
      { key: "qty", label: "Qty", format: "number", align: "right", total: true },
      { key: "revenue", label: "Revenue", format: "currency", align: "right", total: true },
      { key: "avg_ticket", label: "Avg Ticket", format: "currency", align: "right" },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("service_name, service_price, status, branch, booking_date")
        .gte("booking_date", start).lte("booking_date", end);
      q = withBranch(q, branch);
      const { data } = await q;
      const grp = groupBy(data || [], (r: any) => r.service_name || "-");
      return Object.entries(grp).map(([service_name, items]) => {
        const completed = items.filter((r: any) => r.status === "completed");
        const revenue = completed.reduce((s: number, r: any) => s + Number(r.service_price || 0), 0);
        return {
          service_name,
          qty: items.length,
          revenue,
          avg_ticket: completed.length ? Math.round(revenue / completed.length) : 0,
        };
      }).sort((a, b) => b.revenue - a.revenue);
    },
  },
  {
    id: "sales-by-branch",
    category: "sales",
    title: "Booking per Cabang",
    description: "Distribusi booking & revenue per cabang",
    columns: [
      { key: "branch", label: "Cabang" },
      { key: "total", label: "Total Booking", format: "number", align: "right", total: true },
      { key: "completed", label: "Selesai", format: "number", align: "right", total: true },
      { key: "revenue", label: "Revenue", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("branch, status, service_price, booking_date")
        .gte("booking_date", start).lte("booking_date", end);
      q = withBranch(q, branch);
      const { data } = await q;
      const grp = groupBy(data || [], (r: any) => r.branch || "-");
      return Object.entries(grp).map(([br, items]) => ({
        branch: br,
        total: items.length,
        completed: items.filter((r: any) => r.status === "completed").length,
        revenue: items.filter((r: any) => r.status === "completed")
          .reduce((s: number, r: any) => s + Number(r.service_price || 0), 0),
      })).sort((a, b) => b.revenue - a.revenue);
    },
  },
  {
    id: "sales-funnel",
    category: "sales",
    title: "Conversion Funnel",
    description: "Pending → Confirmed → Completed → Cancelled",
    columns: [
      { key: "status", label: "Status" },
      { key: "count", label: "Jumlah", format: "number", align: "right", total: true },
      { key: "share", label: "Share", format: "percent", align: "right" },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("status, booking_date, branch")
        .gte("booking_date", start).lte("booking_date", end);
      q = withBranch(q, branch);
      const { data } = await q;
      const order = ["pending", "waiting_confirmation", "confirmed", "in_progress", "completed", "cancelled"];
      const total = (data || []).length || 1;
      return order.map((s) => {
        const c = (data || []).filter((r: any) => r.status === s).length;
        return { status: s, count: c, share: (c / total) * 100 };
      });
    },
  },

  // ===== FINANCE =====
  {
    id: "finance-revenue-daily",
    category: "finance",
    title: "Pendapatan Harian",
    description: "Pendapatan dari booking selesai per tanggal",
    columns: [
      { key: "date", label: "Tanggal", format: "date" },
      { key: "transactions", label: "Transaksi", format: "number", align: "right", total: true },
      { key: "revenue", label: "Pendapatan", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("booking_date, status, service_price, branch")
        .gte("booking_date", start).lte("booking_date", end).eq("status", "completed");
      q = withBranch(q, branch);
      const { data } = await q;
      const grp = groupBy(data || [], (r: any) => r.booking_date);
      return Object.entries(grp).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
        date,
        transactions: items.length,
        revenue: items.reduce((s: number, r: any) => s + Number(r.service_price || 0), 0),
      }));
    },
  },
  {
    id: "finance-revenue-by-service",
    category: "finance",
    title: "Pendapatan per Layanan",
    description: "Total pendapatan per nama layanan",
    columns: [
      { key: "service_name", label: "Layanan" },
      { key: "qty", label: "Qty", format: "number", align: "right", total: true },
      { key: "revenue", label: "Pendapatan", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("service_name, service_price, branch, booking_date")
        .gte("booking_date", start).lte("booking_date", end).eq("status", "completed");
      q = withBranch(q, branch);
      const { data } = await q;
      const grp = groupBy(data || [], (r: any) => r.service_name || "-");
      return Object.entries(grp).map(([service_name, items]) => ({
        service_name,
        qty: items.length,
        revenue: items.reduce((s: number, r: any) => s + Number(r.service_price || 0), 0),
      })).sort((a, b) => b.revenue - a.revenue);
    },
  },
  {
    id: "finance-outstanding",
    category: "finance",
    title: "Piutang / Outstanding",
    description: "Invoice yang belum lunas",
    columns: [
      { key: "invoice_number", label: "No. Invoice" },
      { key: "created_at", label: "Tanggal", format: "date" },
      { key: "amount", label: "Jumlah", format: "currency", align: "right", total: true },
      { key: "payment_method", label: "Metode" },
      { key: "payment_status", label: "Status" },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("invoices")
        .select("invoice_number, created_at, amount, payment_method, payment_status")
        .neq("payment_status", "paid")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  },

  // ===== PAYMENTS =====
  {
    id: "payments-list",
    category: "payments",
    title: "Daftar Pembayaran",
    description: "Semua transaksi pembayaran dalam periode",
    columns: [
      { key: "created_at", label: "Tanggal", format: "datetime" },
      { key: "amount", label: "Jumlah", format: "currency", align: "right", total: true },
      { key: "payment_method", label: "Metode" },
      { key: "payment_status", label: "Status" },
      { key: "midtrans_order_id", label: "Order ID" },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("payments")
        .select("created_at, amount, payment_method, payment_status, midtrans_order_id")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  },
  {
    id: "payments-by-method",
    category: "payments",
    title: "Rekap per Metode Pembayaran",
    description: "Distribusi metode bayar (cash / transfer / QRIS / Midtrans)",
    columns: [
      { key: "payment_method", label: "Metode" },
      { key: "count", label: "Transaksi", format: "number", align: "right", total: true },
      { key: "total", label: "Total Nilai", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("payments")
        .select("payment_method, amount, payment_status, created_at")
        .eq("payment_status", "paid")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`);
      const grp = groupBy(data || [], (r: any) => r.payment_method || "-");
      return Object.entries(grp).map(([m, items]) => ({
        payment_method: m,
        count: items.length,
        total: items.reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
      })).sort((a, b) => b.total - a.total);
    },
  },
  {
    id: "payments-pending",
    category: "payments",
    title: "Pembayaran Pending & Gagal",
    description: "Transaksi yang belum berhasil",
    columns: [
      { key: "created_at", label: "Tanggal", format: "datetime" },
      { key: "amount", label: "Jumlah", format: "currency", align: "right", total: true },
      { key: "payment_method", label: "Metode" },
      { key: "payment_status", label: "Status" },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("payments")
        .select("created_at, amount, payment_method, payment_status")
        .neq("payment_status", "paid")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  },

  // ===== CUSTOMERS =====
  {
    id: "customers-new",
    category: "customers",
    title: "Customer Baru per Periode",
    description: "Pendaftar baru dalam rentang tanggal",
    columns: [
      { key: "created_at", label: "Tanggal Daftar", format: "date" },
      { key: "full_name", label: "Nama" },
      { key: "phone", label: "Telepon" },
      { key: "customer_id", label: "Member ID" },
      { key: "is_verified", label: "Verified" },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("profiles")
        .select("created_at, full_name, phone, customer_id, is_verified")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`)
        .order("created_at", { ascending: false });
      return (data || []).map((r: any) => ({ ...r, is_verified: r.is_verified ? "Ya" : "Tidak" }));
    },
  },
  {
    id: "customers-top-spend",
    category: "customers",
    title: "Top Customer by Spend",
    description: "Customer dengan total belanja tertinggi (booking selesai)",
    columns: [
      { key: "customer_name", label: "Nama" },
      { key: "customer_phone", label: "Telepon" },
      { key: "transactions", label: "Transaksi", format: "number", align: "right", total: true },
      { key: "spend", label: "Total Spend", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("customer_name, customer_phone, service_price, status, branch, booking_date")
        .eq("status", "completed").gte("booking_date", start).lte("booking_date", end);
      q = withBranch(q, branch);
      const { data } = await q;
      const grp = groupBy(data || [], (r: any) => `${r.customer_phone}|${r.customer_name}`);
      return Object.entries(grp).map(([k, items]) => {
        const [phone, name] = k.split("|");
        return {
          customer_name: name,
          customer_phone: phone,
          transactions: items.length,
          spend: items.reduce((s: number, r: any) => s + Number(r.service_price || 0), 0),
        };
      }).sort((a, b) => b.spend - a.spend).slice(0, 100);
    },
  },
  {
    id: "customers-verification",
    category: "customers",
    title: "Verified vs Unverified",
    description: "Distribusi status verifikasi customer",
    columns: [
      { key: "status", label: "Status" },
      { key: "count", label: "Jumlah", format: "number", align: "right", total: true },
      { key: "share", label: "Share", format: "percent", align: "right" },
    ],
    load: async () => {
      const { data } = await supabase.from("profiles").select("is_verified");
      const total = (data || []).length || 1;
      const v = (data || []).filter((r: any) => r.is_verified).length;
      const u = total - v;
      return [
        { status: "Verified", count: v, share: (v / total) * 100 },
        { status: "Unverified", count: u, share: (u / total) * 100 },
      ];
    },
  },

  // ===== VEHICLES =====
  {
    id: "vehicles-list",
    category: "vehicles",
    title: "Kendaraan Terdaftar",
    description: "Daftar kendaraan customer",
    columns: [
      { key: "license_plate", label: "Plat" },
      { key: "brand", label: "Brand" },
      { key: "model", label: "Model" },
      { key: "year", label: "Tahun", align: "right" },
      { key: "transmission", label: "Transmisi" },
      { key: "fuel_type", label: "BBM" },
      { key: "created_at", label: "Terdaftar", format: "date" },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("vehicles")
        .select("license_plate, brand, model, year, transmission, fuel_type, created_at")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  },
  {
    id: "vehicles-by-brand",
    category: "vehicles",
    title: "Servis per Brand",
    description: "Jumlah booking per brand kendaraan",
    columns: [
      { key: "brand", label: "Brand" },
      { key: "count", label: "Booking", format: "number", align: "right", total: true },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("car_type, branch, booking_date")
        .gte("booking_date", start).lte("booking_date", end);
      q = withBranch(q, branch);
      const { data } = await q;
      const grp = groupBy(data || [], (r: any) => (r.car_type || "-").split(" ")[0]);
      return Object.entries(grp).map(([brand, items]) => ({
        brand, count: items.length,
      })).sort((a, b) => b.count - a.count);
    },
  },
  {
    id: "vehicles-complaints",
    category: "vehicles",
    title: "Riwayat Keluhan Kendaraan",
    description: "Keluhan dari customer & guest",
    columns: [
      { key: "created_at", label: "Tanggal", format: "datetime" },
      { key: "customer_name", label: "Nama" },
      { key: "vehicle_brand", label: "Brand" },
      { key: "vehicle_model", label: "Model" },
      { key: "vehicle_year", label: "Tahun", align: "right" },
      { key: "complaint", label: "Keluhan" },
      { key: "status", label: "Status" },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("vehicle_complaints")
        .select("created_at, customer_name, vehicle_brand, vehicle_model, vehicle_year, complaint, status")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  },

  // ===== LOYALTY =====
  {
    id: "loyalty-summary",
    category: "loyalty",
    title: "Rekap Poin (Earn vs Redeem)",
    description: "Total poin earned vs redeemed per periode",
    columns: [
      { key: "transaction_type", label: "Tipe" },
      { key: "count", label: "Transaksi", format: "number", align: "right", total: true },
      { key: "points", label: "Total Poin", format: "number", align: "right", total: true },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("loyalty_transactions")
        .select("transaction_type, points, created_at")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`);
      const grp = groupBy(data || [], (r: any) => r.transaction_type);
      return Object.entries(grp).map(([t, items]) => ({
        transaction_type: t,
        count: items.length,
        points: items.reduce((s: number, r: any) => s + Number(r.points || 0), 0),
      }));
    },
  },
  {
    id: "loyalty-redemptions",
    category: "loyalty",
    title: "Reward Redemption Log",
    description: "Daftar penukaran reward",
    columns: [
      { key: "created_at", label: "Tanggal", format: "datetime" },
      { key: "redemption_code", label: "Kode" },
      { key: "points_spent", label: "Poin", format: "number", align: "right", total: true },
      { key: "status", label: "Status" },
      { key: "expires_at", label: "Kadaluarsa", format: "date" },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("reward_redemptions")
        .select("created_at, redemption_code, points_spent, status, expires_at")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  },

  // ===== PROMOS =====
  {
    id: "promos-performance",
    category: "promos",
    title: "Performa Promo",
    description: "Claims, used, dan konversi tiap promo",
    columns: [
      { key: "title", label: "Promo" },
      { key: "claims_count", label: "Total Claim", format: "number", align: "right", total: true },
      { key: "used", label: "Used", format: "number", align: "right", total: true },
      { key: "conversion", label: "Konversi", format: "percent", align: "right" },
      { key: "is_active", label: "Aktif" },
    ],
    load: async () => {
      const [{ data: promos }, { data: claims }] = await Promise.all([
        supabase.from("promos").select("id, title, claims_count, is_active"),
        supabase.from("promo_claims").select("promo_id, status"),
      ]);
      const usedMap = (claims || []).reduce((acc: Record<string, number>, c: any) => {
        if (c.status === "used") acc[c.promo_id] = (acc[c.promo_id] || 0) + 1;
        return acc;
      }, {});
      return (promos || []).map((p: any) => {
        const used = usedMap[p.id] || 0;
        return {
          title: p.title,
          claims_count: p.claims_count || 0,
          used,
          conversion: p.claims_count ? (used / p.claims_count) * 100 : 0,
          is_active: p.is_active ? "Ya" : "Tidak",
        };
      }).sort((a, b) => b.claims_count - a.claims_count);
    },
  },
  {
    id: "promos-vouchers",
    category: "promos",
    title: "Voucher Aktif vs Kadaluarsa",
    description: "Status voucher yang di-claim user",
    columns: [
      { key: "status", label: "Status" },
      { key: "count", label: "Jumlah", format: "number", align: "right", total: true },
    ],
    load: async () => {
      const { data } = await supabase.from("promo_claims").select("status");
      const grp = groupBy(data || [], (r: any) => r.status || "-");
      return Object.entries(grp).map(([status, items]) => ({ status, count: items.length }));
    },
  },

  // ===== OPERATIONS =====
  {
    id: "ops-slot-utilization",
    category: "operations",
    title: "Utilisasi Slot",
    description: "Slot yang ter-booking vs kapasitas per cabang",
    columns: [
      { key: "branch", label: "Cabang" },
      { key: "capacity", label: "Kapasitas", format: "number", align: "right", total: true },
      { key: "booked", label: "Terisi", format: "number", align: "right", total: true },
      { key: "utilization", label: "Utilisasi", format: "percent", align: "right" },
    ],
    load: async ({ start, end, branch }) => {
      let slotsQ = supabase.from("booking_slots").select("branch, max_capacity, slot_date")
        .gte("slot_date", start).lte("slot_date", end);
      let bookingsQ = supabase.from("bookings").select("branch, booking_date, status")
        .gte("booking_date", start).lte("booking_date", end).neq("status", "cancelled");
      slotsQ = withBranch(slotsQ, branch);
      bookingsQ = withBranch(bookingsQ, branch);
      const [{ data: slots }, { data: bookings }] = await Promise.all([slotsQ, bookingsQ]);
      const slotGrp = groupBy(slots || [], (r: any) => r.branch || "-");
      const bookGrp = groupBy(bookings || [], (r: any) => r.branch || "-");
      const branches = Array.from(new Set([...Object.keys(slotGrp), ...Object.keys(bookGrp)]));
      return branches.map((br) => {
        const capacity = (slotGrp[br] || []).reduce((s: number, r: any) => s + Number(r.max_capacity || 0), 0);
        const booked = (bookGrp[br] || []).length;
        return {
          branch: br,
          capacity,
          booked,
          utilization: capacity ? (booked / capacity) * 100 : 0,
        };
      }).sort((a, b) => b.utilization - a.utilization);
    },
  },
  {
    id: "ops-branch-performance",
    category: "operations",
    title: "Performa per Cabang",
    description: "Booking, completed rate, dan revenue per cabang",
    columns: [
      { key: "branch", label: "Cabang" },
      { key: "total", label: "Total Booking", format: "number", align: "right", total: true },
      { key: "completed", label: "Selesai", format: "number", align: "right", total: true },
      { key: "completion_rate", label: "Completion Rate", format: "percent", align: "right" },
      { key: "revenue", label: "Revenue", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("bookings").select("branch, status, service_price, booking_date")
        .gte("booking_date", start).lte("booking_date", end);
      const grp = groupBy(data || [], (r: any) => r.branch || "-");
      return Object.entries(grp).map(([br, items]) => {
        const completed = items.filter((r: any) => r.status === "completed");
        return {
          branch: br,
          total: items.length,
          completed: completed.length,
          completion_rate: items.length ? (completed.length / items.length) * 100 : 0,
          revenue: completed.reduce((s: number, r: any) => s + Number(r.service_price || 0), 0),
        };
      }).sort((a, b) => b.revenue - a.revenue);
    },
  },
];

export const reportsByCategory = (cat: string) => REPORTS.filter((r) => r.category === cat);
export const findReport = (id: string) => REPORTS.find((r) => r.id === id);