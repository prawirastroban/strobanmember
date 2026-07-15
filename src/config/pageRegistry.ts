// ============================================================================
// PAGE REGISTRY — single source of truth untuk audit halaman.
// Tidak menggantikan React Router; hanya metadata yang dipakai oleh:
//   - <PageAuditPanel>  (laporan KPI untuk Owner)
//   - <LegacyRedirect>  (redirect URL lama + notifikasi)
//   - <SEOMeta>         (auto noindex untuk DEPRECATED/ARCHIVED)
// ============================================================================

export type PageStatus = "ACTIVE" | "ARCHIVED" | "DEPRECATED" | "REDIRECTED";
export type PageScope = "public" | "auth" | "dashboard";

export interface PageEntry {
  path: string;
  title: string;
  status: PageStatus;
  scope: PageScope;
  replacedBy?: string;
  notes?: string;
}

export const pageRegistry: PageEntry[] = [
  // ── Public ────────────────────────────────────────────────────────────────
  { path: "/",                   title: "Beranda",              status: "ACTIVE", scope: "public" },
  { path: "/promo",              title: "Promo & Voucher",      status: "ACTIVE", scope: "public" },
  { path: "/cabang",             title: "Cabang",               status: "ACTIVE", scope: "public" },
  { path: "/katalog",            title: "Katalog Layanan",      status: "ACTIVE", scope: "public" },
  { path: "/legal/:slug",        title: "Halaman Legal",        status: "ACTIVE", scope: "public" },
  { path: "/review/:token",      title: "Public Review Form",   status: "ACTIVE", scope: "public" },
  { path: "/feedback",           title: "Feedback Publik",      status: "ACTIVE", scope: "public" },

  // ── Auth ──────────────────────────────────────────────────────────────────
  { path: "/auth",               title: "Login / Daftar",       status: "ACTIVE", scope: "auth" },
  { path: "/auth/callback",      title: "OAuth Callback",       status: "ACTIVE", scope: "auth" },
  { path: "/reset-password",     title: "Reset Password (Email)", status: "ACTIVE", scope: "auth" },
  { path: "/reset-password-wa",  title: "Reset Password (WA)",  status: "ACTIVE", scope: "auth" },

  // ── User (protected) ─────────────────────────────────────────────────────
  { path: "/booking",                       title: "Booking Service",         status: "ACTIVE", scope: "public" },
  { path: "/booking/status/:bookingId",     title: "Status Booking",          status: "ACTIVE", scope: "public" },
  { path: "/service/progress/:bookingId",   title: "Live Service Progress",   status: "ACTIVE", scope: "public" },
  { path: "/service/completed/:bookingId",  title: "Service Selesai",         status: "ACTIVE", scope: "public" },
  { path: "/my-booking/:bookingId",         title: "My Booking Detail",       status: "ACTIVE", scope: "public" },
  { path: "/payment/manual/:bookingId",     title: "Pembayaran Manual",       status: "ACTIVE", scope: "public" },
  { path: "/invoice/:bookingId",            title: "Invoice",                 status: "ACTIVE", scope: "public" },
  { path: "/my-vehicles",                   title: "Kendaraan Saya",          status: "ACTIVE", scope: "public" },
  { path: "/my-vehicles/:id",               title: "Detail Kendaraan",        status: "ACTIVE", scope: "public" },
  { path: "/profile",                       title: "Profil Saya",             status: "ACTIVE", scope: "public" },
  { path: "/profile/history-perawatan",     title: "Riwayat Perawatan",       status: "ACTIVE", scope: "public" },
  { path: "/loyalty",                       title: "Loyalty & Rewards",       status: "ACTIVE", scope: "public" },
  { path: "/cashback-history",              title: "Riwayat Cashback",        status: "ACTIVE", scope: "public" },
  { path: "/referral",                      title: "Program Referral",        status: "ACTIVE", scope: "public" },
  { path: "/reminder-service",              title: "Pengingat Servis",        status: "ACTIVE", scope: "public" },
  { path: "/notifications",                 title: "Notification Center",     status: "ACTIVE", scope: "public" },
  { path: "/spk/:id",                       title: "SPK Detail (Canvas)",     status: "ACTIVE", scope: "dashboard" },

  // ── Public REDIRECTED (legacy) ────────────────────────────────────────────
  { path: "/profile/history", title: "Riwayat Servis (lama)", status: "DEPRECATED", scope: "public",
    replacedBy: "/profile/history-perawatan",
    notes: "Diganti oleh halaman riwayat perawatan terbaru." },
  { path: "/checkout",              title: "Checkout (legacy)",       status: "REDIRECTED", scope: "public", replacedBy: "/booking" },
  { path: "/checkout-coming-soon",  title: "Checkout Placeholder",    status: "REDIRECTED", scope: "public", replacedBy: "/booking" },
  { path: "/admin/*",               title: "Admin (legacy prefix)",   status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard" },
  { path: "/staff-setting",         title: "Staff Setting (legacy)",  status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard" },

  // ── Dashboard ACTIVE ──────────────────────────────────────────────────────
  { path: "/dashboard",                          title: "Dashboard Overview",     status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/bookings",                 title: "Confirmation Bookings",  status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/crm",                      title: "CRM",                    status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/slots",                    title: "Kapasitas Slot",         status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/complaints",               title: "Keluhan Kendaraan",      status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/customers",                title: "Customers & Vehicles",   status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/customers/:id",            title: "Customer Detail",        status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/branches",                 title: "Pengaturan Cabang",      status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/pickup-settings",          title: "Pick-up Service",        status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/marketing",                title: "Marketing Overview",     status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/marketing/services",       title: "Services Catalog",       status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/marketing/promos",         title: "Promo & Voucher",        status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/marketing/loyalty",        title: "Loyalty Program",        status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/marketing/rewards",        title: "Rewards",                status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/marketing/branding",       title: "Branding & Logo",        status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/history",                  title: "Pusat Histori",          status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/reports",                  title: "Daftar Laporan",         status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/reports/builder",          title: "Custom Report Builder",  status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/reports/:category",        title: "Report Category",        status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/reports/:category/:id",    title: "Report Detail",          status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/reports/print/:id",        title: "Print Report",           status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/analytics",                title: "Web Analytics",          status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/keuangan/report",          title: "Financial Report",       status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/keuangan/manual-payment",  title: "Pembayaran Manual",      status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/keuangan/referral",        title: "Referral & Komisi",      status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/legal",                    title: "Legal & Dokumen",        status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/audit-log",                title: "Audit Log",              status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/feedback",                 title: "Pusat Kontrol Operasional", status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/feedback/internal",        title: "Bug & Masukan Internal", status: "ACTIVE", scope: "dashboard", notes: "Hidden — tidak di sidebar." },
  { path: "/dashboard/pwa-settings",             title: "PWA & Install Banner",   status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/app-version",              title: "Versi Aplikasi",         status: "ACTIVE", scope: "dashboard" },
  { path: "/dashboard/test-transactions",        title: "Test Transactions",      status: "ACTIVE", scope: "dashboard", notes: "Hidden — utility Owner." },
  { path: "/dashboard/page-audit",               title: "Audit Halaman",          status: "ACTIVE", scope: "dashboard", notes: "Hidden — Owner only." },

  // ── Dashboard REDIRECTED (legacy) ────────────────────────────────────────
  { path: "/dashboard/scanner",              title: "Scanner (legacy)",         status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard/bookings?action=scan" },
  { path: "/dashboard/inventory",            title: "Inventory (legacy)",       status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard/customers" },
  { path: "/dashboard/roles",                title: "Roles (legacy)",           status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard/customers" },
  { path: "/dashboard/services",             title: "Services (legacy)",        status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard/marketing/services" },
  { path: "/dashboard/loyalty",              title: "Loyalty (legacy)",         status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard/marketing/loyalty" },
  { path: "/dashboard/rewards",              title: "Rewards (legacy)",         status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard/marketing/rewards" },
  { path: "/dashboard/branding",             title: "Branding (legacy)",        status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard/marketing/branding" },
  { path: "/dashboard/user-verification",    title: "User Verification (legacy)", status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard/customers" },
  { path: "/dashboard/users",                title: "Users (legacy)",           status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard/customers" },
  { path: "/dashboard/payments",             title: "Payments (legacy)",        status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard/history?tab=payments" },
  { path: "/dashboard/keuangan",             title: "Keuangan Index (legacy)",  status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard/keuangan/report" },
  { path: "/dashboard/keuangan/payment",     title: "Keuangan Payment (legacy)", status: "REDIRECTED", scope: "dashboard", replacedBy: "/dashboard/history?tab=payments" },

  // ── Archived (file masih ada di _archive/, tidak ter-mount) ───────────────
  { path: "(archived) ServiceHistory.tsx",   title: "Riwayat Servis lama",      status: "ARCHIVED", scope: "public",
    replacedBy: "/profile/history-perawatan",
    notes: "src/pages/_archive/ServiceHistory.tsx" },
  { path: "(archived) FinanceDashboard.tsx", title: "Finance Dashboard lama",   status: "ARCHIVED", scope: "dashboard",
    replacedBy: "/dashboard/keuangan/report",
    notes: "src/components/admin/_archive/FinanceDashboard.tsx" },
];

/** Cari entry registry berdasarkan pathname eksak. */
export function findPageEntry(pathname: string): PageEntry | undefined {
  return pageRegistry.find((p) => p.path === pathname);
}

export function isNoIndexPath(pathname: string): boolean {
  const entry = findPageEntry(pathname);
  return entry?.status === "DEPRECATED" || entry?.status === "ARCHIVED";
}

export interface AuditCounts {
  total: number;
  active: number;
  archived: number;
  deprecated: number;
  redirected: number;
  duplicateFound: number;
  duplicateResolved: number;
}

export function getAuditCounts(): AuditCounts {
  const total = pageRegistry.length;
  const active = pageRegistry.filter((p) => p.status === "ACTIVE").length;
  const archived = pageRegistry.filter((p) => p.status === "ARCHIVED").length;
  const deprecated = pageRegistry.filter((p) => p.status === "DEPRECATED").length;
  const redirected = pageRegistry.filter((p) => p.status === "REDIRECTED").length;
  // Duplicate: setiap halaman yang punya replacedBy dianggap "duplicate resolved".
  const duplicateResolved = pageRegistry.filter((p) => !!p.replacedBy).length;
  return {
    total,
    active,
    archived,
    deprecated,
    redirected,
    duplicateFound: duplicateResolved,
    duplicateResolved,
  };
}