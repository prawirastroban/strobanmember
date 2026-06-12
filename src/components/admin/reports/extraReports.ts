import { supabase } from "@/integrations/supabase/client";
import type { ReportDefinition, CategoryMeta } from "./types";

const groupBy = <T,>(arr: T[], key: (x: T) => string): Record<string, T[]> =>
  arr.reduce((acc, item) => {
    const k = key(item) || "-";
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);

const withBranch = (q: any, branch?: string | null) =>
  branch && branch !== "all" ? q.eq("branch", branch) : q;

/** Extra categories appended to base CATEGORIES. */
export const EXTRA_CATEGORIES: CategoryMeta[] = [
  { id: "referral", label: "Referral", description: "Konversi referral & komisi", icon: "Share2" },
  { id: "inventory", label: "Inventory (Ban)", description: "Stok, fast & slow moving", icon: "Package" },
  { id: "purchasing", label: "Purchasing", description: "Pembelian & supplier (segera)", icon: "Truck" },
  { id: "adoption", label: "Adopsi Platform", description: "Sumber booking & self-booking rate", icon: "Rocket" },
];

/** Extra reports appended to base REPORTS. */
export const EXTRA_REPORTS: ReportDefinition[] = [
  // ===== SALES (Bulanan) =====
  {
    id: "sales-monthly",
    category: "sales",
    title: "Ringkasan Booking Bulanan",
    description: "Total booking & revenue per bulan",
    columns: [
      { key: "month", label: "Bulan" },
      { key: "total", label: "Jumlah Booking", format: "number", align: "right", total: true },
      { key: "completed", label: "Selesai", format: "number", align: "right", total: true },
      { key: "revenue", label: "Revenue", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("booking_date, status, service_price, branch")
        .gte("booking_date", start).lte("booking_date", end);
      q = withBranch(q, branch);
      const { data } = await q;
      const grp = groupBy(data || [], (r: any) => (r.booking_date || "").slice(0, 7));
      return Object.entries(grp).sort(([a], [b]) => a.localeCompare(b)).map(([month, items]) => ({
        month,
        total: items.length,
        completed: items.filter((r: any) => r.status === "completed").length,
        revenue: items.filter((r: any) => r.status === "completed")
          .reduce((s: number, r: any) => s + Number(r.service_price || 0), 0),
      }));
    },
  },

  // ===== CUSTOMERS =====
  {
    id: "customers-active",
    category: "customers",
    title: "Customer Aktif (Punya Booking)",
    description: "Customer dengan minimal 1 booking di periode",
    columns: [
      { key: "customer_name", label: "Nama" },
      { key: "customer_phone", label: "Telepon" },
      { key: "bookings", label: "Booking", format: "number", align: "right", total: true },
      { key: "last_booking", label: "Terakhir", format: "date" },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("customer_name, customer_phone, booking_date, branch")
        .gte("booking_date", start).lte("booking_date", end);
      q = withBranch(q, branch);
      const { data } = await q;
      const grp = groupBy(data || [], (r: any) => `${r.customer_phone}|${r.customer_name}`);
      return Object.entries(grp).map(([k, items]) => {
        const [phone, name] = k.split("|");
        const dates = items.map((r: any) => r.booking_date).sort();
        return {
          customer_name: name,
          customer_phone: phone,
          bookings: items.length,
          last_booking: dates[dates.length - 1],
        };
      }).sort((a, b) => b.bookings - a.bookings);
    },
  },
  {
    id: "customers-by-vehicle",
    category: "customers",
    title: "Customer per Brand Kendaraan",
    description: "Distribusi customer berdasar brand kendaraan booking",
    columns: [
      { key: "brand", label: "Brand" },
      { key: "customers", label: "Customer Unik", format: "number", align: "right", total: true },
      { key: "bookings", label: "Booking", format: "number", align: "right", total: true },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("customer_phone, car_type, booking_date, branch")
        .gte("booking_date", start).lte("booking_date", end);
      q = withBranch(q, branch);
      const { data } = await q;
      const grp = groupBy(data || [], (r: any) => (r.car_type || "-").split(" ")[0]);
      return Object.entries(grp).map(([brand, items]) => ({
        brand,
        customers: new Set(items.map((r: any) => r.customer_phone)).size,
        bookings: items.length,
      })).sort((a, b) => b.bookings - a.bookings);
    },
  },

  // ===== FINANCE — cost components =====
  {
    id: "finance-promo-cost",
    category: "finance",
    title: "Biaya Promo (Diskon)",
    description: "Total diskon yang diberikan via promo dalam periode",
    columns: [
      { key: "date", label: "Tanggal", format: "date" },
      { key: "claims", label: "Klaim", format: "number", align: "right", total: true },
      { key: "discount", label: "Diskon", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("promo_claims")
        .select("claimed_at, discount_amount")
        .gte("claimed_at", `${start}T00:00:00`).lte("claimed_at", `${end}T23:59:59`);
      const grp = groupBy(data || [], (r: any) => (r.claimed_at || "").slice(0, 10));
      return Object.entries(grp).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
        date,
        claims: items.length,
        discount: items.reduce((s: number, r: any) => s + Number(r.discount_amount || 0), 0),
      }));
    },
  },
  {
    id: "finance-loyalty-cost",
    category: "finance",
    title: "Biaya Loyalty (Point Diredeem)",
    description: "Estimasi nilai point yang ditukar dalam periode",
    columns: [
      { key: "date", label: "Tanggal", format: "date" },
      { key: "transactions", label: "Transaksi", format: "number", align: "right", total: true },
      { key: "points", label: "Point", format: "number", align: "right", total: true },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("loyalty_transactions")
        .select("created_at, points, transaction_type")
        .eq("transaction_type", "redeem")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`);
      const grp = groupBy(data || [], (r: any) => (r.created_at || "").slice(0, 10));
      return Object.entries(grp).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
        date,
        transactions: items.length,
        points: items.reduce((s: number, r: any) => s + Math.abs(Number(r.points || 0)), 0),
      }));
    },
  },
  {
    id: "finance-referral-cost",
    category: "finance",
    title: "Biaya Referral (Komisi)",
    description: "Total komisi referral dalam periode",
    columns: [
      { key: "date", label: "Tanggal", format: "date" },
      { key: "count", label: "Komisi", format: "number", align: "right", total: true },
      { key: "amount", label: "Nilai", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("referral_commissions")
        .select("created_at, commission_amount")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`);
      const grp = groupBy(data || [], (r: any) => (r.created_at || "").slice(0, 10));
      return Object.entries(grp).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
        date,
        count: items.length,
        amount: items.reduce((s: number, r: any) => s + Number(r.commission_amount || 0), 0),
      }));
    },
  },

  // ===== PROMOS =====
  {
    id: "promos-usage",
    category: "promos",
    title: "Penggunaan Promo",
    description: "Frekuensi klaim per promo",
    columns: [
      { key: "promo_code", label: "Kode Promo" },
      { key: "claims", label: "Klaim", format: "number", align: "right", total: true },
      { key: "discount", label: "Total Diskon", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("promo_claims")
        .select("promo_code, discount_amount, claimed_at")
        .gte("claimed_at", `${start}T00:00:00`).lte("claimed_at", `${end}T23:59:59`);
      const grp = groupBy(data || [], (r: any) => r.promo_code || "-");
      return Object.entries(grp).map(([code, items]) => ({
        promo_code: code,
        claims: items.length,
        discount: items.reduce((s: number, r: any) => s + Number(r.discount_amount || 0), 0),
      })).sort((a, b) => b.claims - a.claims);
    },
  },

  // ===== LOYALTY =====
  {
    id: "loyalty-earned",
    category: "loyalty",
    title: "Point Diberikan",
    description: "Point yang di-earn customer per tanggal",
    columns: [
      { key: "date", label: "Tanggal", format: "date" },
      { key: "transactions", label: "Transaksi", format: "number", align: "right", total: true },
      { key: "points", label: "Point", format: "number", align: "right", total: true },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("loyalty_transactions")
        .select("created_at, points, transaction_type")
        .eq("transaction_type", "earn")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`);
      const grp = groupBy(data || [], (r: any) => (r.created_at || "").slice(0, 10));
      return Object.entries(grp).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
        date,
        transactions: items.length,
        points: items.reduce((s: number, r: any) => s + Number(r.points || 0), 0),
      }));
    },
  },
  {
    id: "loyalty-redeemed",
    category: "loyalty",
    title: "Point Digunakan",
    description: "Point yang ditukar customer per tanggal",
    columns: [
      { key: "date", label: "Tanggal", format: "date" },
      { key: "transactions", label: "Transaksi", format: "number", align: "right", total: true },
      { key: "points", label: "Point", format: "number", align: "right", total: true },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("loyalty_transactions")
        .select("created_at, points, transaction_type")
        .eq("transaction_type", "redeem")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`);
      const grp = groupBy(data || [], (r: any) => (r.created_at || "").slice(0, 10));
      return Object.entries(grp).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
        date,
        transactions: items.length,
        points: items.reduce((s: number, r: any) => s + Math.abs(Number(r.points || 0)), 0),
      }));
    },
  },

  // ===== REFERRAL =====
  {
    id: "referral-success",
    category: "referral",
    title: "Referral Berhasil",
    description: "Konversi referral menjadi komisi",
    columns: [
      { key: "date", label: "Tanggal", format: "date" },
      { key: "count", label: "Komisi", format: "number", align: "right", total: true },
      { key: "amount", label: "Total", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("referral_commissions")
        .select("created_at, commission_amount")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`);
      const grp = groupBy(data || [], (r: any) => (r.created_at || "").slice(0, 10));
      return Object.entries(grp).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({
        date,
        count: items.length,
        amount: items.reduce((s: number, r: any) => s + Number(r.commission_amount || 0), 0),
      }));
    },
  },
  {
    id: "referral-revenue",
    category: "referral",
    title: "Revenue dari Referral",
    description: "Nilai booking yang berasal dari referral (komisi-related)",
    columns: [
      { key: "referrer_id", label: "Referrer" },
      { key: "count", label: "Booking", format: "number", align: "right", total: true },
      { key: "amount", label: "Komisi", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("referral_commissions")
        .select("referrer_id, commission_amount, created_at")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`);
      const grp = groupBy(data || [], (r: any) => r.referrer_id || "-");
      return Object.entries(grp).map(([id, items]) => ({
        referrer_id: String(id).slice(0, 12),
        count: items.length,
        amount: items.reduce((s: number, r: any) => s + Number(r.commission_amount || 0), 0),
      })).sort((a, b) => b.amount - a.amount);
    },
  },

  // ===== INVENTORY (Tires) =====
  {
    id: "inventory-stock",
    category: "inventory",
    title: "Stok Ban",
    description: "Daftar stok ban saat ini",
    columns: [
      { key: "brand", label: "Brand" },
      { key: "size", label: "Ukuran" },
      { key: "pattern", label: "Pattern" },
      { key: "stock", label: "Stok", format: "number", align: "right", total: true },
      { key: "price", label: "Harga", format: "currency", align: "right" },
    ],
    load: async () => {
      const { data } = await supabase.from("tires")
        .select("brand, size, pattern, stock, price")
        .order("brand", { ascending: true });
      return (data || []) as any[];
    },
  },
  {
    id: "inventory-fast-moving",
    category: "inventory",
    title: "Fast Moving",
    description: "Ban paling laku di periode",
    columns: [
      { key: "tire_label", label: "Ban" },
      { key: "qty", label: "Qty Terjual", format: "number", align: "right", total: true },
      { key: "revenue", label: "Revenue", format: "currency", align: "right", total: true },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("tire_orders")
        .select("brand, size, pattern, qty, total_price, created_at, status")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`);
      const grp = groupBy(data || [], (r: any) => `${r.brand || "-"} ${r.size || ""} ${r.pattern || ""}`.trim());
      return Object.entries(grp).map(([label, items]) => ({
        tire_label: label,
        qty: items.reduce((s: number, r: any) => s + Number(r.qty || 0), 0),
        revenue: items.reduce((s: number, r: any) => s + Number(r.total_price || 0), 0),
      })).sort((a, b) => b.qty - a.qty).slice(0, 100);
    },
  },
  {
    id: "inventory-slow-moving",
    category: "inventory",
    title: "Slow Moving",
    description: "Stok ban tanpa penjualan 30 hari terakhir",
    columns: [
      { key: "brand", label: "Brand" },
      { key: "size", label: "Ukuran" },
      { key: "pattern", label: "Pattern" },
      { key: "stock", label: "Stok", format: "number", align: "right", total: true },
    ],
    load: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const sinceIso = since.toISOString();
      const [{ data: stocks }, { data: orders }] = await Promise.all([
        supabase.from("tires").select("brand, size, pattern, stock"),
        supabase.from("tire_orders").select("brand, size, pattern, qty, created_at").gte("created_at", sinceIso),
      ]);
      const soldKeys = new Set((orders || []).map((o: any) => `${o.brand}|${o.size}|${o.pattern}`));
      return (stocks || [])
        .filter((t: any) => Number(t.stock) > 0 && !soldKeys.has(`${t.brand}|${t.size}|${t.pattern}`))
        .sort((a: any, b: any) => Number(b.stock) - Number(a.stock));
    },
  },

  // ===== PURCHASING (placeholder) =====
  {
    id: "purchasing-placeholder",
    category: "purchasing",
    title: "Pembelian (Coming Soon)",
    description: "Modul pembelian & supplier sedang dalam persiapan",
    columns: [
      { key: "info", label: "Info" },
    ],
    load: async () => [],
  },

  // ===== ADOPSI PLATFORM =====
  {
    id: "adoption-booking-source-performance",
    category: "adoption",
    title: "Booking Source Performance",
    description: "Performa per sumber booking: total, revenue, customer, AOV, conv. rate",
    columns: [
      { key: "booking_source", label: "Sumber" },
      { key: "total", label: "Total Booking", format: "number", align: "right", total: true },
      { key: "revenue", label: "Total Revenue", format: "currency", align: "right", total: true },
      { key: "customers", label: "Total Customer", format: "number", align: "right", total: true },
      { key: "avg_ticket", label: "Avg Transaction", format: "currency", align: "right" },
      { key: "conversion_rate", label: "Conversion Rate", format: "percent", align: "right" },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("booking_source, service_price, status, customer_phone, branch, booking_date")
        .gte("booking_date", start).lte("booking_date", end);
      q = withBranch(q, branch);
      const { data } = await q;
      const grp = groupBy(data || [], (r: any) => r.booking_source || "lainnya");
      return Object.entries(grp).map(([src, items]) => {
        const completed = items.filter((r: any) => r.status === "completed");
        const revenue = completed.reduce((s: number, r: any) => s + Number(r.service_price || 0), 0);
        const uniq = new Set(items.map((r: any) => r.customer_phone || "-"));
        return {
          booking_source: src,
          total: items.length,
          revenue,
          customers: uniq.size,
          avg_ticket: completed.length ? Math.round(revenue / completed.length) : 0,
          conversion_rate: items.length ? (completed.length / items.length) * 100 : 0,
        };
      }).sort((a, b) => b.total - a.total);
    },
    kpis: (rows) => {
      const total = rows.reduce((s, r) => s + (r.total || 0), 0);
      const rev = rows.reduce((s, r) => s + (r.revenue || 0), 0);
      return [
        { label: "Total Booking", value: total.toLocaleString("id-ID") },
        { label: "Total Revenue", value: `Rp ${rev.toLocaleString("id-ID")}` },
        { label: "Jumlah Source", value: String(rows.length) },
      ];
    },
  },
  {
    id: "adoption-self-booking-rate",
    category: "adoption",
    title: "Self Booking Rate",
    description: "Rasio booking mandiri vs manual per hari",
    columns: [
      { key: "date", label: "Tanggal", format: "date" },
      { key: "total", label: "Total Booking", format: "number", align: "right", total: true },
      { key: "self_booking", label: "Self Booking", format: "number", align: "right", total: true },
      { key: "manual_booking", label: "Manual Booking", format: "number", align: "right", total: true },
      { key: "self_rate", label: "Self Booking Rate", format: "percent", align: "right" },
    ],
    load: async ({ start, end, branch }) => {
      let q = supabase.from("bookings").select("booking_date, booking_source, branch")
        .gte("booking_date", start).lte("booking_date", end);
      q = withBranch(q, branch);
      const { data } = await q;
      const grp = groupBy(data || [], (r: any) => r.booking_date);
      return Object.entries(grp).sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => {
        const self_b = items.filter((r: any) => r.booking_source === "self_booking").length;
        const total = items.length;
        return {
          date,
          total,
          self_booking: self_b,
          manual_booking: total - self_b,
          self_rate: total ? (self_b / total) * 100 : 0,
        };
      });
    },
    kpis: (rows) => {
      const total = rows.reduce((s, r) => s + (r.total || 0), 0);
      const self_b = rows.reduce((s, r) => s + (r.self_booking || 0), 0);
      const manual = total - self_b;
      const rate = total ? (self_b / total) * 100 : 0;
      return [
        { label: "Total Booking", value: total.toLocaleString("id-ID") },
        { label: "Self Booking", value: self_b.toLocaleString("id-ID") },
        { label: "Manual Booking", value: manual.toLocaleString("id-ID") },
        { label: "Self Booking Rate", value: `${rate.toFixed(1)}%` },
      ];
    },
  },
  {
    id: "adoption-booking-manager-performance",
    category: "adoption",
    title: "Booking Manager Performance",
    description: "Performa admin/CS/staff yang membuatkan booking customer",
    columns: [
      { key: "manager_name", label: "Nama" },
      { key: "role", label: "Peran" },
      { key: "branch", label: "Cabang" },
      { key: "total", label: "Total Booking", format: "number", align: "right", total: true },
      { key: "revenue", label: "Revenue", format: "currency", align: "right", total: true },
      { key: "customers", label: "Customer Unik", format: "number", align: "right", total: true },
      { key: "completed", label: "Selesai", format: "number", align: "right", total: true },
      { key: "cancelled", label: "Batal", format: "number", align: "right", total: true },
      { key: "conversion_rate", label: "Conv. Rate", format: "percent", align: "right" },
    ],
    load: async ({ start, end, branch }) => {
      const MANUAL = ["booking_manager", "branch_staff", "call_center", "marketing"];
      let q = supabase.from("bookings")
        .select("created_by, created_by_role, created_branch, booking_source, service_price, status, customer_phone, branch, booking_date")
        .gte("booking_date", start).lte("booking_date", end)
        .in("booking_source", MANUAL);
      q = withBranch(q, branch);
      const { data } = await q;
      const rows = data || [];
      const ids = Array.from(new Set(rows.map((r: any) => r.created_by).filter(Boolean)));
      const nameMap: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        (profs || []).forEach((p: any) => { nameMap[p.id] = p.full_name || "-"; });
      }
      const grp = groupBy(rows, (r: any) => r.created_by || "-");
      return Object.entries(grp).map(([uid, items]) => {
        const completed = items.filter((r: any) => r.status === "completed");
        const cancelled = items.filter((r: any) => r.status === "cancelled");
        const revenue = completed.reduce((s: number, r: any) => s + Number(r.service_price || 0), 0);
        const uniq = new Set(items.map((r: any) => r.customer_phone || "-"));
        const first: any = items[0];
        return {
          manager_name: nameMap[uid] || "(tanpa nama)",
          role: first?.created_by_role || "-",
          branch: first?.created_branch || first?.branch || "-",
          total: items.length,
          revenue,
          customers: uniq.size,
          completed: completed.length,
          cancelled: cancelled.length,
          conversion_rate: items.length ? (completed.length / items.length) * 100 : 0,
        };
      }).sort((a, b) => b.total - a.total);
    },
  },
  {
    id: "customers-acquisition-source",
    category: "customers",
    title: "Customer Acquisition Source",
    description: "Distribusi customer berdasarkan sumber masuk pertama",
    columns: [
      { key: "source", label: "Sumber" },
      { key: "customers", label: "Jumlah Customer", format: "number", align: "right", total: true },
      { key: "share", label: "Share", format: "percent", align: "right" },
    ],
    load: async ({ start, end }) => {
      const { data } = await supabase.from("profiles")
        .select("acquisition_source, first_booking_source, created_at")
        .gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`);
      const rows = data || [];
      const grp = groupBy(rows, (r: any) => r.acquisition_source || r.first_booking_source || "direct_visit");
      const total = rows.length || 1;
      return Object.entries(grp).map(([source, items]) => ({
        source,
        customers: items.length,
        share: (items.length / total) * 100,
      })).sort((a, b) => b.customers - a.customers);
    },
  },
];