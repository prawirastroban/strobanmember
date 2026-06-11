import { supabase } from "@/integrations/supabase/client";
import type { ReportDefinition, CategoryMeta } from "./types";
import { EXTRA_CATEGORIES, EXTRA_REPORTS } from "./extraReports";

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
const BASE_CATEGORIES: CategoryMeta[] = [
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

export const CATEGORIES: CategoryMeta[] = [...BASE_CATEGORIES, ...EXTRA_CATEGORIES];

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
  {
    id: "customers-admin-response",
    category: "customers",
    title: "Respon Rate Admin Penerima Booking",
    description: "Rata-rata waktu respon admin saat memproses booking customer",
    columns: [
      { key: "actor_name", label: "Admin" },
      { key: "role_label", label: "Peran" },
      { key: "branch", label: "Cabang" },
      { key: "bookings_count", label: "Booking", format: "number", align: "right", total: true },
      { key: "actions", label: "Total Aksi", format: "number", align: "right", total: true },
      { key: "avg_minutes", label: "Avg Respon (menit)", format: "number", align: "right" },
      { key: "median_minutes", label: "Median (menit)", format: "number", align: "right" },
      { key: "max_minutes", label: "Terlama (menit)", format: "number", align: "right" },
      { key: "last_action_at", label: "Aksi Terakhir", format: "datetime" },
    ],
    load: async ({ start, end, branch }) => {
      const RECEIVE_TRANSITIONS = new Set([
        "pending|waiting_confirmation",
        "waiting_confirmation|confirmed",
        "pending|confirmed",
        "confirmed|checked_in",
        "checked_in|in_progress",
      ]);
      const { data: logs } = await supabase
        .from("booking_status_logs")
        .select("booking_id, changed_by, changed_at, from_status, to_status, duration_from_prev_minutes")
        .gte("changed_at", `${start}T00:00:00`)
        .lte("changed_at", `${end}T23:59:59`)
        .not("changed_by", "is", null);
      if (!logs || logs.length === 0) return [];
      const relevant = logs.filter((l: any) =>
        RECEIVE_TRANSITIONS.has(`${l.from_status || ""}|${l.to_status}`)
      );
      if (relevant.length === 0) return [];

      const bookingIds = Array.from(new Set(relevant.map((l: any) => l.booking_id)));
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, branch")
        .in("id", bookingIds);
      const branchMap = new Map((bookings || []).map((b: any) => [b.id, b.branch]));
      const filtered = relevant.filter((l: any) => {
        if (branch && branch !== "all") return branchMap.get(l.booking_id) === branch;
        return true;
      });
      if (filtered.length === 0) return [];

      const actorIds = Array.from(new Set(filtered.map((l: any) => l.changed_by)));
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, assigned_branch").in("id", actorIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", actorIds),
      ]);
      const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const roleMap = new Map<string, string>();
      (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      const grp = groupBy(filtered, (l: any) => l.changed_by);
      return Object.entries(grp).map(([uid, items]) => {
        const p = profMap.get(uid) as any;
        const role = roleMap.get(uid) || "user";
        const roleLabel =
          role === "admin_cabang" ? "Admin Cabang" :
          role === "admin" ? "Admin Pusat" :
          role === "staff" ? "CS Pusat" : role;
        const durations = items
          .map((l: any) => Number(l.duration_from_prev_minutes))
          .filter((n) => Number.isFinite(n) && n >= 0)
          .sort((a, b) => a - b);
        const avg = durations.length ? durations.reduce((s, n) => s + n, 0) / durations.length : 0;
        const median = durations.length ? durations[Math.floor(durations.length / 2)] : 0;
        const max = durations.length ? durations[durations.length - 1] : 0;
        const uniqueBookings = new Set(items.map((l: any) => l.booking_id)).size;
        const lastAt = items
          .map((l: any) => l.changed_at)
          .sort()
          .slice(-1)[0];
        return {
          actor_name: p?.full_name || uid.slice(0, 8),
          role_label: roleLabel,
          branch: p?.assigned_branch || "-",
          bookings_count: uniqueBookings,
          actions: items.length,
          avg_minutes: Math.round(avg * 10) / 10,
          median_minutes: Math.round(median * 10) / 10,
          max_minutes: Math.round(max * 10) / 10,
          last_action_at: lastAt,
        };
      }).sort((a, b) => a.avg_minutes - b.avg_minutes);
    },
    kpis: (rows) => {
      const totalActions = rows.reduce((s, r) => s + (r.actions || 0), 0);
      const totalBookings = rows.reduce((s, r) => s + (r.bookings_count || 0), 0);
      const weighted = rows.reduce((s, r) => s + (r.avg_minutes || 0) * (r.actions || 0), 0);
      const avgAll = totalActions ? weighted / totalActions : 0;
      return [
        { label: "Total Admin", value: rows.length.toLocaleString("id-ID") },
        { label: "Total Booking", value: totalBookings.toLocaleString("id-ID") },
        { label: "Avg Respon Global", value: `${(Math.round(avgAll * 10) / 10).toLocaleString("id-ID")} menit` },
      ];
    },
  },
  {
    id: "customers-admin-transition-log",
    category: "customers",
    title: "Log Transisi Booking Customer (Detail)",
    description: "Riwayat tiap perubahan status booking customer dengan waktu respon",
    columns: [
      { key: "changed_at", label: "Waktu", format: "datetime" },
      { key: "customer_name", label: "Customer" },
      { key: "customer_phone", label: "Telepon" },
      { key: "booking_code", label: "Booking" },
      { key: "branch", label: "Cabang" },
      { key: "actor_name", label: "Admin" },
      { key: "role_label", label: "Peran" },
      { key: "transition", label: "Transisi" },
      { key: "duration_minutes", label: "Respon (menit)", format: "number", align: "right" },
    ],
    load: async ({ start, end, branch }) => {
      const { data: logs } = await supabase
        .from("booking_status_logs")
        .select("booking_id, from_status, to_status, changed_at, changed_by, duration_from_prev_minutes")
        .gte("changed_at", `${start}T00:00:00`)
        .lte("changed_at", `${end}T23:59:59`)
        .order("changed_at", { ascending: false })
        .limit(500);
      if (!logs || logs.length === 0) return [];

      const bookingIds = Array.from(new Set(logs.map((l: any) => l.booking_id)));
      const actorIds = Array.from(new Set(logs.map((l: any) => l.changed_by).filter(Boolean)));
      const [{ data: bookings }, { data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("bookings").select("id, branch, customer_name, customer_phone").in("id", bookingIds),
        actorIds.length
          ? supabase.from("profiles").select("id, full_name").in("id", actorIds)
          : Promise.resolve({ data: [] as any[] }),
        actorIds.length
          ? supabase.from("user_roles").select("user_id, role").in("user_id", actorIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const bMap = new Map((bookings || []).map((b: any) => [b.id, b]));
      const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const roleMap = new Map<string, string>();
      (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      return logs
        .map((l: any) => {
          const b = bMap.get(l.booking_id) as any;
          if (branch && branch !== "all" && b?.branch !== branch) return null;
          const p = l.changed_by ? (profMap.get(l.changed_by) as any) : null;
          const role = l.changed_by ? roleMap.get(l.changed_by) : null;
          const roleLabel =
            role === "admin_cabang" ? "Admin Cabang" :
            role === "admin" ? "Admin Pusat" :
            role === "staff" ? "CS Pusat" :
            role === "user" ? "Customer" : (role || "Sistem");
          return {
            changed_at: l.changed_at,
            customer_name: b?.customer_name || "-",
            customer_phone: b?.customer_phone || "-",
            booking_code: String(l.booking_id).slice(0, 8).toUpperCase(),
            branch: b?.branch || "-",
            actor_name: p?.full_name || (l.changed_by ? String(l.changed_by).slice(0, 8) : "Sistem"),
            role_label: roleLabel,
            transition: `${l.from_status || "-"} → ${l.to_status}`,
            duration_minutes: l.duration_from_prev_minutes != null ? Math.round(Number(l.duration_from_prev_minutes) * 10) / 10 : null,
          };
        })
        .filter(Boolean) as any[];
    },
  },

  // ===== CUSTOMER REVIEWS =====
  {
    id: "customers-reviews-list",
    category: "customers",
    title: "Daftar Review per Pelanggan",
    description: "Semua review pelanggan: rating, kepuasan, channel & catatan",
    columns: [
      { key: "submitted_at", label: "Tanggal", format: "datetime" },
      { key: "customer_name", label: "Customer" },
      { key: "customer_phone", label: "Telepon" },
      { key: "branch", label: "Cabang" },
      { key: "service_name", label: "Layanan" },
      { key: "rating", label: "Rating", format: "number", align: "right" },
      { key: "service_quality", label: "Kepuasan" },
      { key: "would_recommend", label: "Rekomendasi" },
      { key: "channel", label: "Channel" },
      { key: "follow_up_status", label: "Status FU" },
      { key: "review_text", label: "Catatan" },
    ],
    load: async ({ start, end, branch }) => {
      const startIso = `${start}T00:00:00`;
      const endIso = `${end}T23:59:59`;
      const { data: reviews } = await supabase
        .from("booking_reviews")
        .select("booking_id, rating, review_text, service_quality, would_recommend, follow_up_status, submitted_via, submitted_at, created_at")
        .or(`submitted_at.gte.${startIso},and(submitted_at.is.null,created_at.gte.${startIso})`)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false });
      if (!reviews || reviews.length === 0) return [];
      const ids = Array.from(new Set(reviews.map((r: any) => r.booking_id)));
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, customer_name, customer_phone, branch, service_name")
        .in("id", ids);
      const bMap = new Map((bookings || []).map((b: any) => [b.id, b]));
      const channelLabel = (v: string | null) => {
        if (v === "customer_form") return "Web Link";
        if (v === "wa_reply") return "WA Balas";
        if (v === "manual_admin" || v === "manual" || !v) return "Manual Admin";
        return v;
      };
      return reviews
        .map((r: any) => {
          const b = bMap.get(r.booking_id) as any;
          if (!b) return null;
          if (branch && branch !== "all" && b.branch !== branch) return null;
          return {
            submitted_at: r.submitted_at || r.created_at,
            customer_name: b.customer_name || "-",
            customer_phone: b.customer_phone || "-",
            branch: b.branch || "-",
            service_name: b.service_name || "-",
            rating: r.rating,
            service_quality: r.service_quality || "-",
            would_recommend: r.would_recommend || "-",
            channel: channelLabel(r.submitted_via),
            follow_up_status: r.follow_up_status || "-",
            review_text: r.review_text || "",
          };
        })
        .filter(Boolean) as any[];
    },
    kpis: (rows) => {
      const total = rows.length;
      const avg = total ? rows.reduce((s, r) => s + Number(r.rating || 0), 0) / total : 0;
      const puas = rows.filter((r) => r.service_quality === "puas").length;
      const rec = rows.filter((r) => r.would_recommend === "ya").length;
      return [
        { label: "Total Review", value: total.toLocaleString("id-ID") },
        { label: "Rata-rata Rating", value: `${(Math.round(avg * 10) / 10).toLocaleString("id-ID")} ★` },
        { label: "% Puas", value: `${total ? Math.round((puas / total) * 100) : 0}%` },
        { label: "% Rekomendasi", value: `${total ? Math.round((rec / total) * 100) : 0}%` },
      ];
    },
  },
  {
    id: "customers-reviews-kpi",
    category: "customers",
    title: "Ringkasan Harian Review",
    description: "Tren harian: jumlah review, rata-rata rating, % puas, response rate",
    columns: [
      { key: "date", label: "Tanggal", format: "date" },
      { key: "completed_bookings", label: "Booking Selesai", format: "number", align: "right", total: true },
      { key: "reviews", label: "Review Masuk", format: "number", align: "right", total: true },
      { key: "response_rate", label: "Response Rate", format: "percent", align: "right" },
      { key: "avg_rating", label: "Avg Rating", format: "number", align: "right" },
      { key: "satisfied_pct", label: "% Puas", format: "percent", align: "right" },
      { key: "recommend_pct", label: "% Rekomendasi", format: "percent", align: "right" },
    ],
    load: async ({ start, end, branch }) => {
      let bq = supabase.from("bookings")
        .select("id, booking_date, branch, status, service_status")
        .gte("booking_date", start).lte("booking_date", end);
      bq = withBranch(bq, branch);
      const { data: bookings } = await bq;
      const completed = (bookings || []).filter((b: any) => b.status === "completed" || b.service_status === "completed");
      const ids = completed.map((b: any) => b.id);
      const bDateMap = new Map(completed.map((b: any) => [b.id, b.booking_date]));
      const { data: reviews } = ids.length
        ? await supabase.from("booking_reviews")
            .select("booking_id, rating, service_quality, would_recommend, submitted_at, created_at")
            .in("booking_id", ids)
        : { data: [] as any[] };
      const completedByDay = groupBy(completed, (b: any) => b.booking_date);
      const reviewsByDay: Record<string, any[]> = {};
      (reviews || []).forEach((r: any) => {
        const day = bDateMap.get(r.booking_id) as string | undefined;
        if (!day) return;
        (reviewsByDay[day] ||= []).push(r);
      });
      const allDays = Array.from(new Set([...Object.keys(completedByDay), ...Object.keys(reviewsByDay)])).sort();
      return allDays.map((date) => {
        const cb = (completedByDay[date] || []).length;
        const rv = reviewsByDay[date] || [];
        const total = rv.length;
        const avg = total ? rv.reduce((s: number, r: any) => s + Number(r.rating || 0), 0) / total : 0;
        const puas = rv.filter((r: any) => r.service_quality === "puas").length;
        const rec = rv.filter((r: any) => r.would_recommend === "ya").length;
        return {
          date,
          completed_bookings: cb,
          reviews: total,
          response_rate: cb ? (total / cb) * 100 : 0,
          avg_rating: Math.round(avg * 10) / 10,
          satisfied_pct: total ? (puas / total) * 100 : 0,
          recommend_pct: total ? (rec / total) * 100 : 0,
        };
      });
    },
    kpis: (rows) => {
      const cb = rows.reduce((s, r) => s + (r.completed_bookings || 0), 0);
      const rv = rows.reduce((s, r) => s + (r.reviews || 0), 0);
      const weightedAvg = rv ? rows.reduce((s, r) => s + (r.avg_rating || 0) * (r.reviews || 0), 0) / rv : 0;
      return [
        { label: "Booking Selesai", value: cb.toLocaleString("id-ID") },
        { label: "Review Masuk", value: rv.toLocaleString("id-ID") },
        { label: "Response Rate", value: `${cb ? Math.round((rv / cb) * 100) : 0}%` },
        { label: "Avg Rating", value: `${(Math.round(weightedAvg * 10) / 10).toLocaleString("id-ID")} ★` },
      ];
    },
  },
  {
    id: "customers-reviews-channel",
    category: "customers",
    title: "Rekap Review per Channel & Cabang",
    description: "Distribusi channel pengisian review (Web / WA / Manual) per cabang",
    columns: [
      { key: "branch", label: "Cabang" },
      { key: "channel", label: "Channel" },
      { key: "count", label: "Jumlah", format: "number", align: "right", total: true },
      { key: "avg_rating", label: "Avg Rating", format: "number", align: "right" },
    ],
    load: async ({ start, end, branch }) => {
      const startIso = `${start}T00:00:00`;
      const endIso = `${end}T23:59:59`;
      const { data: reviews } = await supabase
        .from("booking_reviews")
        .select("booking_id, rating, submitted_via, submitted_at, created_at")
        .gte("created_at", startIso).lte("created_at", endIso);
      if (!reviews || reviews.length === 0) return [];
      const ids = Array.from(new Set(reviews.map((r: any) => r.booking_id)));
      const { data: bookings } = await supabase
        .from("bookings").select("id, branch").in("id", ids);
      const branchMap = new Map((bookings || []).map((b: any) => [b.id, b.branch]));
      const channelLabel = (v: string | null) => {
        if (v === "customer_form") return "Web Link";
        if (v === "wa_reply") return "WA Balas";
        return "Manual Admin";
      };
      const filtered = reviews
        .map((r: any) => ({
          ...r,
          branch: branchMap.get(r.booking_id) || "-",
          channel: channelLabel(r.submitted_via),
        }))
        .filter((r: any) => !branch || branch === "all" || r.branch === branch);
      const grp = groupBy(filtered, (r: any) => `${r.branch}||${r.channel}`);
      return Object.entries(grp).map(([k, items]) => {
        const [br, ch] = k.split("||");
        const ratings = items.map((r: any) => Number(r.rating || 0)).filter((n) => n > 0);
        const avg = ratings.length ? ratings.reduce((s, n) => s + n, 0) / ratings.length : 0;
        return {
          branch: br,
          channel: ch,
          count: items.length,
          avg_rating: Math.round(avg * 10) / 10,
        };
      }).sort((a, b) => b.count - a.count);
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

  // ===== RESPONSE RATE =====
  {
    id: "response-by-actor",
    category: "response",
    title: "Respon Rate per Admin",
    description: "Rata-rata waktu respon (menit) tiap admin saat memproses booking",
    columns: [
      { key: "actor_name", label: "Admin" },
      { key: "role_label", label: "Peran" },
      { key: "branch", label: "Cabang" },
      { key: "actions", label: "Total Aksi", format: "number", align: "right", total: true },
      { key: "avg_minutes", label: "Avg Respon (menit)", format: "number", align: "right" },
      { key: "median_minutes", label: "Median (menit)", format: "number", align: "right" },
      { key: "max_minutes", label: "Terlama (menit)", format: "number", align: "right" },
    ],
    load: async ({ start, end, branch }) => {
      const { data: logs } = await supabase
        .from("booking_status_logs")
        .select("booking_id, changed_by, changed_at, from_status, to_status, duration_from_prev_minutes")
        .gte("changed_at", `${start}T00:00:00`)
        .lte("changed_at", `${end}T23:59:59`)
        .not("changed_by", "is", null)
        .not("duration_from_prev_minutes", "is", null);
      if (!logs || logs.length === 0) return [];

      // Branch filter via bookings join
      const bookingIds = Array.from(new Set(logs.map((l: any) => l.booking_id)));
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, branch")
        .in("id", bookingIds);
      const branchMap = new Map((bookings || []).map((b: any) => [b.id, b.branch]));

      const filteredLogs = logs.filter((l: any) => {
        if (branch && branch !== "all") return branchMap.get(l.booking_id) === branch;
        return true;
      });
      if (filteredLogs.length === 0) return [];

      // Resolve actor profiles + roles
      const actorIds = Array.from(new Set(filteredLogs.map((l: any) => l.changed_by)));
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, assigned_branch").in("id", actorIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", actorIds),
      ]);
      const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const roleMap = new Map<string, string>();
      (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      const grp = groupBy(filteredLogs, (l: any) => l.changed_by);
      return Object.entries(grp).map(([uid, items]) => {
        const p = profMap.get(uid) as any;
        const role = roleMap.get(uid) || "user";
        const roleLabel =
          role === "admin_cabang" ? "Admin Cabang" :
          role === "admin" ? "Admin Pusat" :
          role === "staff" ? "CS Pusat" : role;
        const durations = items
          .map((l: any) => Number(l.duration_from_prev_minutes))
          .filter((n) => Number.isFinite(n) && n >= 0)
          .sort((a, b) => a - b);
        const avg = durations.length
          ? durations.reduce((s, n) => s + n, 0) / durations.length
          : 0;
        const median = durations.length
          ? durations[Math.floor(durations.length / 2)]
          : 0;
        const max = durations.length ? durations[durations.length - 1] : 0;
        return {
          actor_name: p?.full_name || uid.slice(0, 8),
          role_label: roleLabel,
          branch: p?.assigned_branch || "-",
          actions: items.length,
          avg_minutes: Math.round(avg * 10) / 10,
          median_minutes: Math.round(median * 10) / 10,
          max_minutes: Math.round(max * 10) / 10,
        };
      }).sort((a, b) => a.avg_minutes - b.avg_minutes);
    },
    kpis: (rows) => {
      const totalActions = rows.reduce((s, r) => s + (r.actions || 0), 0);
      const weighted = rows.reduce((s, r) => s + (r.avg_minutes || 0) * (r.actions || 0), 0);
      const avgAll = totalActions ? weighted / totalActions : 0;
      return [
        { label: "Total Admin Aktif", value: rows.length.toLocaleString("id-ID") },
        { label: "Total Aksi", value: totalActions.toLocaleString("id-ID") },
        { label: "Avg Respon Global", value: `${(Math.round(avgAll * 10) / 10).toLocaleString("id-ID")} menit` },
      ];
    },
  },
  {
    id: "response-by-transition",
    category: "response",
    title: "Respon Rate per Transisi Status",
    description: "Rata-rata waktu antar perubahan status booking",
    columns: [
      { key: "transition", label: "Transisi" },
      { key: "count", label: "Jumlah", format: "number", align: "right", total: true },
      { key: "avg_minutes", label: "Avg (menit)", format: "number", align: "right" },
      { key: "median_minutes", label: "Median (menit)", format: "number", align: "right" },
      { key: "max_minutes", label: "Terlama (menit)", format: "number", align: "right" },
    ],
    load: async ({ start, end, branch }) => {
      const { data: logs } = await supabase
        .from("booking_status_logs")
        .select("booking_id, from_status, to_status, duration_from_prev_minutes, changed_at")
        .gte("changed_at", `${start}T00:00:00`)
        .lte("changed_at", `${end}T23:59:59`)
        .not("duration_from_prev_minutes", "is", null);
      if (!logs || logs.length === 0) return [];

      let filtered = logs;
      if (branch && branch !== "all") {
        const ids = Array.from(new Set(logs.map((l: any) => l.booking_id)));
        const { data: bks } = await supabase.from("bookings").select("id, branch").in("id", ids);
        const allowed = new Set((bks || []).filter((b: any) => b.branch === branch).map((b: any) => b.id));
        filtered = logs.filter((l: any) => allowed.has(l.booking_id));
      }

      const grp = groupBy(filtered, (l: any) => `${l.from_status || "-"} → ${l.to_status}`);
      return Object.entries(grp).map(([transition, items]) => {
        const durations = items
          .map((l: any) => Number(l.duration_from_prev_minutes))
          .filter((n) => Number.isFinite(n) && n >= 0)
          .sort((a, b) => a - b);
        const avg = durations.length ? durations.reduce((s, n) => s + n, 0) / durations.length : 0;
        const median = durations.length ? durations[Math.floor(durations.length / 2)] : 0;
        const max = durations.length ? durations[durations.length - 1] : 0;
        return {
          transition,
          count: items.length,
          avg_minutes: Math.round(avg * 10) / 10,
          median_minutes: Math.round(median * 10) / 10,
          max_minutes: Math.round(max * 10) / 10,
        };
      }).sort((a, b) => b.count - a.count);
    },
  },
  {
    id: "response-log",
    category: "response",
    title: "Log Aksi Booking (Detail)",
    description: "Riwayat tiap perubahan status: kapan, oleh siapa, dan berapa lama responnya",
    columns: [
      { key: "changed_at", label: "Waktu", format: "datetime" },
      { key: "actor_name", label: "Admin" },
      { key: "role_label", label: "Peran" },
      { key: "branch", label: "Cabang" },
      { key: "booking_code", label: "Booking" },
      { key: "transition", label: "Transisi" },
      { key: "duration_minutes", label: "Respon (menit)", format: "number", align: "right" },
    ],
    load: async ({ start, end, branch }) => {
      const { data: logs } = await supabase
        .from("booking_status_logs")
        .select("booking_id, from_status, to_status, changed_at, changed_by, duration_from_prev_minutes")
        .gte("changed_at", `${start}T00:00:00`)
        .lte("changed_at", `${end}T23:59:59`)
        .order("changed_at", { ascending: false })
        .limit(500);
      if (!logs || logs.length === 0) return [];

      const bookingIds = Array.from(new Set(logs.map((l: any) => l.booking_id)));
      const actorIds = Array.from(new Set(logs.map((l: any) => l.changed_by).filter(Boolean)));
      const [{ data: bookings }, { data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("bookings").select("id, branch").in("id", bookingIds),
        actorIds.length
          ? supabase.from("profiles").select("id, full_name, assigned_branch").in("id", actorIds)
          : Promise.resolve({ data: [] as any[] }),
        actorIds.length
          ? supabase.from("user_roles").select("user_id, role").in("user_id", actorIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const branchMap = new Map((bookings || []).map((b: any) => [b.id, b.branch]));
      const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const roleMap = new Map<string, string>();
      (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      const filtered = logs.filter((l: any) =>
        !branch || branch === "all" ? true : branchMap.get(l.booking_id) === branch
      );

      return filtered.map((l: any) => {
        const p = l.changed_by ? (profMap.get(l.changed_by) as any) : null;
        const role = l.changed_by ? roleMap.get(l.changed_by) : null;
        const roleLabel =
          role === "admin_cabang" ? "Admin Cabang" :
          role === "admin" ? "Admin Pusat" :
          role === "staff" ? "CS Pusat" :
          role || "Sistem";
        return {
          changed_at: l.changed_at,
          actor_name: p?.full_name || (l.changed_by ? l.changed_by.slice(0, 8) : "Sistem"),
          role_label: roleLabel,
          branch: branchMap.get(l.booking_id) || p?.assigned_branch || "-",
          booking_code: (l.booking_id || "").slice(0, 8).toUpperCase(),
          transition: `${l.from_status || "-"} → ${l.to_status}`,
          duration_minutes:
            l.duration_from_prev_minutes != null
              ? Math.round(Number(l.duration_from_prev_minutes) * 10) / 10
              : null,
        };
      });
    },
  },
];

export const ALL_REPORTS: ReportDefinition[] = [...REPORTS, ...EXTRA_REPORTS];

export const reportsByCategory = (cat: string) => ALL_REPORTS.filter((r) => r.category === cat);
export const findReport = (id: string) => ALL_REPORTS.find((r) => r.id === id);