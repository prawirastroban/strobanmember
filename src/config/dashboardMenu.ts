// ============================================================================
// SUMBER TUNGGAL menu dashboard (ERP-style information architecture).
//
// Cara menambah menu baru:
//   1. Tambahkan entry `{ title, url, icon }` ke `dashboardMenu`.
//   2. Kategori otomatis diisi oleh `inferSection(url, title)`.
//   3. Override hanya jika perlu: isi field `section` secara manual.
//   4. Sidebar (AdminSidebar) dan Overview (Quick Access) akan otomatis ikut.
//
// Urutan kategori fixed:
//   OPERASIONAL → PELANGGAN → MARKETING → KEUANGAN → LAPORAN → PENGATURAN → PUSAT KONTROL
// ============================================================================

import {
  CalendarCheck, BarChart2, MessageSquareWarning, CalendarClock, Users,
  Building2, Truck, Megaphone, LayoutGrid, Tag, Trophy, Gift,
  Image as ImageIcon, Clock, FileBarChart, Wallet,
  FileCheck2, Share2, TrendingUp, FileText,
  ShieldAlert, Bug, Download, Activity,
  LayoutDashboard, ClipboardList, ListChecks, Plus, Workflow, Zap, Settings2, Wrench, BarChart3,
} from "lucide-react";

export type RequiredRole = "owner" | "no_branch" | "not_spk_only";

export type DashboardSection =
  | "operasional"
  | "pelanggan"
  | "marketing"
  | "keuangan"
  | "laporan"
  | "pengaturan"
  | "pusat_kontrol";

export interface RoleFlags {
  isStaff: boolean;
  isAdminCabang: boolean;
  isSpkOnly?: boolean;
}

export interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: RequiredRole;
  /** Optional — bila kosong, akan di-infer otomatis dari url + title. */
  section?: DashboardSection;
  children?: MenuItem[];
  hideInOverview?: boolean;
  hideInSidebar?: boolean;
}

/** Fixed display order. */
export const SECTION_ORDER: DashboardSection[] = [
  "operasional",
  "pelanggan",
  "marketing",
  "keuangan",
  "laporan",
  "pengaturan",
  "pusat_kontrol",
];

export const SECTION_META: Record<DashboardSection, { title: string }> = {
  operasional:    { title: "Operasional" },
  pelanggan:      { title: "Pelanggan" },
  marketing:      { title: "Marketing" },
  keuangan:       { title: "Keuangan" },
  laporan:        { title: "Laporan" },
  pengaturan:     { title: "Pengaturan" },
  pusat_kontrol:  { title: "Pusat Kontrol" },
};

// ── Auto-categorization engine ──────────────────────────────────────────────
//
// Priority:
//   1. Explicit `section` override on the item itself.
//   2. URL prefix match (most specific first).
//   3. Title keyword fallback.
//   4. Default → "pengaturan" with a dev-only console warning.
//

type Rule = { test: (url: string) => boolean; section: DashboardSection };

const URL_RULES: Rule[] = [
  // Pusat Kontrol — eskalasi/aksi
  { test: u => u.startsWith("/dashboard/complaints"),           section: "pusat_kontrol" },
  { test: u => u.startsWith("/dashboard/feedback"),             section: "pusat_kontrol" },

  // Laporan
  { test: u => u.startsWith("/dashboard/reports"),              section: "laporan" },

  // Pengaturan
  { test: u => u.startsWith("/dashboard/branches"),             section: "pengaturan" },
  { test: u => u.startsWith("/dashboard/legal"),                section: "pengaturan" },
  { test: u => u.startsWith("/dashboard/audit-log"),            section: "pengaturan" },
  { test: u => u.startsWith("/dashboard/pwa-settings"),         section: "pengaturan" },
  { test: u => u.startsWith("/dashboard/system-management"),    section: "pengaturan" },
  { test: u => u.startsWith("/dashboard/app-version"),          section: "pengaturan" },
  { test: u => u.startsWith("/dashboard/maintenance"),          section: "pengaturan" },

  // Keuangan
  { test: u => u.startsWith("/dashboard/keuangan"),             section: "keuangan" },
  { test: u => u.startsWith("/dashboard/history"),              section: "keuangan" },
  { test: u => u.startsWith("/dashboard/payments"),             section: "keuangan" },

  // Pelanggan (cek loyalty SEBELUM marketing umum)
  { test: u => u === "/dashboard/marketing/loyalty",            section: "pelanggan" },
  { test: u => u.startsWith("/dashboard/customers"),            section: "pelanggan" },
  { test: u => u.startsWith("/dashboard/crm"),                  section: "pelanggan" },
  { test: u => u.startsWith("/dashboard/vehicles"),             section: "pelanggan" },

  // Marketing
  { test: u => u.startsWith("/dashboard/marketing"),            section: "marketing" },

  // Operasional
  { test: u => u.startsWith("/dashboard/bookings"),             section: "operasional" },
  { test: u => u.startsWith("/dashboard/slots"),                section: "operasional" },
  { test: u => u.startsWith("/dashboard/pickup"),               section: "operasional" },
  { test: u => u.startsWith("/dashboard/scanner"),              section: "operasional" },
  { test: u => u.startsWith("/dashboard/spk"),                  section: "operasional" },
  { test: u => u.startsWith("/spk"),                            section: "operasional" },
];

const TITLE_RULES: { keywords: RegExp; section: DashboardSection }[] = [
  { keywords: /correction|feedback|bug|complaint|keluhan|koreksi|masukan/i,    section: "pusat_kontrol" },
  { keywords: /report|laporan|analytic|kpi/i,                                  section: "laporan" },
  { keywords: /branch|cabang|legal|audit|pwa|install|setting|pengaturan/i,     section: "pengaturan" },
  { keywords: /payment|finance|keuangan|commission|komisi|invoice|referral/i,  section: "keuangan" },
  { keywords: /customer|crm|pelanggan|loyalty|vehicle|kendaraan/i,             section: "pelanggan" },
  { keywords: /service|promo|reward|branding|marketing/i,                      section: "marketing" },
  { keywords: /booking|slot|pickup|scanner|jemput/i,                           section: "operasional" },
];

export function inferSection(url: string, title: string): DashboardSection {
  for (const r of URL_RULES) if (r.test(url)) return r.section;
  for (const r of TITLE_RULES) if (r.keywords.test(title)) return r.section;
  if (typeof console !== "undefined" && import.meta.env?.DEV) {
    console.warn(`[dashboardMenu] could not infer section for "${title}" (${url}); falling back to "pengaturan".`);
  }
  return "pengaturan";
}

/** Returns the explicit section if set, otherwise inferred. */
function sectionOf(item: MenuItem, parent?: MenuItem): DashboardSection {
  if (item.section) return item.section;
  // Children fall back to inference based on their own url/title, NOT parent's section,
  // so e.g. Marketing → Loyalty correctly lands in PELANGGAN.
  const inferred = inferSection(item.url, item.title);
  // If inference failed AND we have a parent, inherit the parent's resolved section.
  if (inferred === "pengaturan" && parent) return sectionOf(parent);
  return inferred;
}

// ── Menu data ───────────────────────────────────────────────────────────────
//
// Note: most entries omit `section` — kategori diisi otomatis.
// Hanya override yang berbeda dari hasil inferensi (mis. CRM Overview di
// /dashboard/crm sudah otomatis "pelanggan", jadi tidak perlu di-set).
//
export const dashboardMenu: MenuItem[] = [
  { title: "Confirmation Bookings", url: "/dashboard/bookings",       icon: CalendarCheck },
  { title: "Kapasitas Slot",        url: "/dashboard/slots",          icon: CalendarClock },
  { title: "Pick-up Service",       url: "/dashboard/pickup-settings", icon: Truck, requiredRole: "owner" },
  {
    title: "SPK / Work Order",
    url: "/dashboard/spk",
    icon: ClipboardList,
    children: [
      { title: "Dashboard",        url: "/dashboard/spk",               icon: LayoutDashboard },
      { title: "All SPK",          url: "/dashboard/spk/all",           icon: ListChecks },
      { title: "Configuration",    url: "/dashboard/spk/configuration", icon: Settings2,  requiredRole: "owner" },
      { title: "Analytics & Reports", url: "/dashboard/spk/reports",    icon: FileBarChart },
    ],
  },

  { title: "CRM", url: "/dashboard/crm", icon: BarChart2 },
  { title: "Customers & Vehicles", url: "/dashboard/customers", icon: Users },

  {
    title: "Marketing",
    url: "/dashboard/marketing",
    icon: Megaphone,
    requiredRole: "owner",
    children: [
      { title: "Overview",         url: "/dashboard/marketing",          icon: Megaphone },
      { title: "Services",         url: "/dashboard/marketing/services", icon: LayoutGrid },
      { title: "Promos",           url: "/dashboard/marketing/promos",   icon: Tag },
      { title: "Loyalty",          url: "/dashboard/marketing/loyalty",  icon: Trophy },
      { title: "Rewards",          url: "/dashboard/marketing/rewards",  icon: Gift },
      { title: "Branding & Logo",  url: "/dashboard/marketing/branding", icon: ImageIcon },
      { title: "Pop-up Promo",     url: "/dashboard/marketing/popups",   icon: Megaphone },
      { title: "Banner Beranda",   url: "/dashboard/marketing/banners",  icon: ImageIcon },
      { title: "Referral & Komisi", url: "/dashboard/keuangan/referral", icon: Share2, requiredRole: "owner" },
    ],
  },

  { title: "Transaction History", url: "/dashboard/history", icon: Clock },

  { title: "Web Analytics", url: "/dashboard/analytics", icon: Activity, requiredRole: "owner", section: "laporan" },

  {
    title: "Daftar Laporan",
    url: "/dashboard/reports",
    icon: FileBarChart,
  },

  {
    title: "Keuangan",
    url: "/dashboard/keuangan",
    icon: Wallet,
    children: [
      { title: "Financial Report",    url: "/dashboard/keuangan/report",         icon: TrendingUp, requiredRole: "no_branch" },
      { title: "Pembayaran Manual",   url: "/dashboard/keuangan/manual-payment", icon: FileCheck2, requiredRole: "owner" },
    ],
  },

  // Pengaturan
  { title: "Pengaturan Cabang", url: "/dashboard/branches",     icon: Building2, requiredRole: "owner" },
  { title: "Legal & Dokumen",   url: "/dashboard/legal",        icon: FileText,  requiredRole: "owner" },
  { title: "Audit Log",         url: "/dashboard/audit-log",    icon: ShieldAlert, requiredRole: "owner" },
  {
    title: "System Management",
    url: "/dashboard/system-management",
    icon: LayoutDashboard,
    requiredRole: "no_branch",
    children: [
      { title: "Overview",       url: "/dashboard/system-management", icon: LayoutDashboard, requiredRole: "no_branch" },
      { title: "PWA & Install",  url: "/dashboard/pwa-settings",      icon: Download,        requiredRole: "owner" },
    ],
  },

  // Pusat Kontrol
  { title: "Keluhan Kendaraan",  url: "/dashboard/complaints",          icon: MessageSquareWarning },
  { title: "Bug & Masukan",      url: "/dashboard/feedback",            icon: Bug },
];

// ── Role helpers ────────────────────────────────────────────────────────────

export function passesRole(req: RequiredRole | undefined, flags: RoleFlags): boolean {
  if (!req) return true;
  if (req === "owner") return flags.isStaff;
  if (req === "no_branch") return !flags.isAdminCabang && !flags.isSpkOnly;
  if (req === "not_spk_only") return !flags.isSpkOnly;
  return false;
}

/** Resolve final section of an item (with override > inference). Exported for tests/debugging. */
export function resolveSection(item: MenuItem, parent?: MenuItem): DashboardSection {
  return sectionOf(item, parent);
}

// ── Consumers ───────────────────────────────────────────────────────────────

/**
 * Sidebar consumer: returns items grouped by section (per top-level item's section).
 * Children stay nested under their parent so collapsibles keep working.
 */
export function getSidebarSections(
  flags: RoleFlags,
): { section: DashboardSection; items: MenuItem[] }[] {
  const buckets = new Map<DashboardSection, MenuItem[]>();
  for (const s of SECTION_ORDER) buckets.set(s, []);

  const visible = dashboardMenu
    .filter(it => !it.hideInSidebar && passesRole(it.requiredRole, flags))
    // SPK-only roles (mekanik) hanya melihat entry SPK.
    .filter(it => !flags.isSpkOnly || it.url.startsWith("/dashboard/spk"))
    .map(it =>
      it.children
        ? {
            ...it,
            children: it.children.filter(c => !c.hideInSidebar && passesRole(c.requiredRole, flags)),
          }
        : it,
    )
    .filter(it => !it.children || it.children.length > 0);

  for (const item of visible) {
    const sec = sectionOf(item);
    buckets.get(sec)!.push(item);
  }

  return SECTION_ORDER
    .map(section => ({ section, items: buckets.get(section)! }))
    .filter(g => g.items.length > 0);
}

/** Back-compat: flat list of visible items (used by legacy code). */
export function getVisibleMenu(flags: RoleFlags): MenuItem[] {
  return getSidebarSections(flags).flatMap(g => g.items);
}

/**
 * Overview consumer: flattens parents-with-children into their children,
 * then buckets each leaf into ITS OWN section (so Loyalty → PELANGGAN even
 * though its parent Marketing → MARKETING).
 */
export function getOverviewTiles(flags: RoleFlags): Record<DashboardSection, MenuItem[]> {
  const buckets: Record<DashboardSection, MenuItem[]> = {
    operasional: [], pelanggan: [], marketing: [], keuangan: [],
    laporan: [], pengaturan: [], pusat_kontrol: [],
  };

  for (const item of dashboardMenu) {
    if (item.hideInOverview) continue;
    if (!passesRole(item.requiredRole, flags)) continue;

    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        if (child.hideInOverview) continue;
        if (!passesRole(child.requiredRole, flags)) continue;
        buckets[sectionOf(child, item)].push(child);
      }
    } else {
      buckets[sectionOf(item)].push(item);
    }
  }

  return buckets;
}

/** Lookup helper used by Quick Access tiles. */
export function findMenuByUrl(url: string): MenuItem | undefined {
  for (const item of dashboardMenu) {
    if (item.url === url) return item;
    if (item.children) {
      const child = item.children.find(c => c.url === url);
      if (child) return child;
    }
  }
  return undefined;
}