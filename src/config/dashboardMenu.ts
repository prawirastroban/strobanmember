// SUMBER TUNGGAL menu dashboard.
// Menambah menu baru: cukup tambah entry di sini.
// - Sidebar (AdminSidebar) dan Overview (DashboardMenuGrid) akan otomatis menampilkannya.
// - Set `section` untuk menentukan kolom Overview ("operasional" | "marketing" | "lainnya").
// - Set `hideInOverview` / `hideInSidebar` jika perlu menyembunyikan di salah satu tempat.

import {
  CalendarCheck, BarChart2, MessageSquareWarning, CalendarClock, Users,
  Building2, Truck, Megaphone, LayoutGrid, Tag, Trophy, Gift,
  Image as ImageIcon, Clock, FileBarChart, ShoppingBag, Wallet,
  CreditCard, Car, FileCheck2, Share2, TrendingUp, FileText,
  ShieldAlert, Bug, Download,
} from "lucide-react";

export type RequiredRole = "owner" | "no_branch";
export type DashboardSection = "operasional" | "marketing" | "lainnya";

export interface RoleFlags {
  isStaff: boolean;
  isAdminCabang: boolean;
}

export interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: RequiredRole;
  section: DashboardSection;
  children?: MenuItem[];
  hideInOverview?: boolean;
  hideInSidebar?: boolean;
}

export const SECTION_META: Record<DashboardSection, { title: string }> = {
  operasional: { title: "Operasional" },
  marketing: { title: "Marketing" },
  lainnya: { title: "Lainnya" },
};

export const dashboardMenu: MenuItem[] = [
  { title: "Confirmation Bookings", url: "/dashboard/bookings", icon: CalendarCheck, section: "operasional" },
  {
    title: "CRM",
    url: "/dashboard/crm",
    icon: BarChart2,
    section: "operasional",
    children: [
      { title: "Overview", url: "/dashboard/crm", icon: BarChart2, section: "operasional" },
      { title: "Keluhan Kendaraan", url: "/dashboard/complaints", icon: MessageSquareWarning, section: "operasional" },
    ],
  },
  { title: "Kapasitas Slot", url: "/dashboard/slots", icon: CalendarClock, section: "operasional" },
  { title: "Customers & Vehicles", url: "/dashboard/customers", icon: Users, section: "operasional" },
  { title: "Pengaturan Cabang", url: "/dashboard/branches", icon: Building2, requiredRole: "owner", section: "operasional" },
  { title: "Pick-up Service", url: "/dashboard/pickup-settings", icon: Truck, requiredRole: "owner", section: "operasional" },
  {
    title: "Marketing",
    url: "/dashboard/marketing",
    icon: Megaphone,
    requiredRole: "owner",
    section: "marketing",
    children: [
      { title: "Overview", url: "/dashboard/marketing", icon: Megaphone, section: "marketing" },
      { title: "Services", url: "/dashboard/marketing/services", icon: LayoutGrid, section: "marketing" },
      { title: "Promos", url: "/dashboard/marketing/promos", icon: Tag, section: "marketing" },
      { title: "Loyalty", url: "/dashboard/marketing/loyalty", icon: Trophy, section: "marketing" },
      { title: "Rewards", url: "/dashboard/marketing/rewards", icon: Gift, section: "marketing" },
      { title: "Branding & Logo", url: "/dashboard/marketing/branding", icon: ImageIcon, section: "marketing" },
    ],
  },
  { title: "Transaction History", url: "/dashboard/history", icon: Clock, section: "lainnya" },
  {
    title: "Daftar Laporan",
    url: "/dashboard/reports",
    icon: FileBarChart,
    section: "lainnya",
    children: [
      { title: "Overview", url: "/dashboard/reports", icon: FileBarChart, section: "lainnya" },
      { title: "Penjualan & Booking", url: "/dashboard/reports/sales", icon: ShoppingBag, section: "lainnya" },
      { title: "Keuangan", url: "/dashboard/reports/finance", icon: Wallet, section: "lainnya" },
      { title: "Pembayaran", url: "/dashboard/reports/payments", icon: CreditCard, section: "lainnya" },
      { title: "Pelanggan (CRM)", url: "/dashboard/reports/customers", icon: Users, section: "lainnya" },
      { title: "Kendaraan & Servis", url: "/dashboard/reports/vehicles", icon: Car, section: "lainnya" },
      { title: "Loyalty & Rewards", url: "/dashboard/reports/loyalty", icon: Trophy, section: "lainnya" },
      { title: "Promo & Voucher", url: "/dashboard/reports/promos", icon: Tag, section: "lainnya" },
      { title: "Operasional Cabang", url: "/dashboard/reports/operations", icon: Building2, section: "lainnya" },
    ],
  },
  {
    title: "Keuangan",
    url: "/dashboard/keuangan",
    icon: Wallet,
    section: "lainnya",
    children: [
      { title: "Financial Report", url: "/dashboard/keuangan/report", icon: TrendingUp, requiredRole: "no_branch", section: "lainnya" },
      { title: "Payments", url: "/dashboard/keuangan/payment", icon: CreditCard, section: "lainnya" },
      { title: "Pembayaran Manual", url: "/dashboard/keuangan/manual-payment", icon: FileCheck2, requiredRole: "owner", section: "lainnya" },
      { title: "Referral & Komisi", url: "/dashboard/keuangan/referral", icon: Share2, requiredRole: "owner", section: "lainnya" },
    ],
  },
  { title: "Legal & Dokumen", url: "/dashboard/legal", icon: FileText, requiredRole: "owner", section: "lainnya" },
  { title: "Audit Log", url: "/dashboard/audit-log", icon: ShieldAlert, requiredRole: "owner", section: "lainnya" },
  { title: "Permintaan Koreksi", url: "/dashboard/correction-requests", icon: ShieldAlert, requiredRole: "owner", section: "lainnya" },
  { title: "Bug & Masukan", url: "/dashboard/feedback", icon: Bug, section: "lainnya" },
  { title: "PWA & Install", url: "/dashboard/pwa-settings", icon: Download, requiredRole: "owner", section: "lainnya" },
];

export function passesRole(req: RequiredRole | undefined, flags: RoleFlags): boolean {
  if (!req) return true;
  if (req === "owner") return flags.isStaff;
  if (req === "no_branch") return !flags.isAdminCabang;
  return false;
}

/** Sidebar consumer: keep tree shape, filter by role. */
export function getVisibleMenu(flags: RoleFlags): MenuItem[] {
  return dashboardMenu
    .filter((item) => !item.hideInSidebar && passesRole(item.requiredRole, flags))
    .map((item) =>
      item.children
        ? {
            ...item,
            children: item.children.filter(
              (c) => !c.hideInSidebar && passesRole(c.requiredRole, flags),
            ),
          }
        : item,
    )
    .filter((item) => !item.children || item.children.length > 0);
}

/** Overview consumer: flatten parents-with-children into their children. */
export function getOverviewTiles(flags: RoleFlags): Record<DashboardSection, MenuItem[]> {
  const buckets: Record<DashboardSection, MenuItem[]> = {
    operasional: [],
    marketing: [],
    lainnya: [],
  };

  for (const item of dashboardMenu) {
    if (item.hideInOverview) continue;
    if (!passesRole(item.requiredRole, flags)) continue;

    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        if (child.hideInOverview) continue;
        if (!passesRole(child.requiredRole, flags)) continue;
        buckets[child.section].push(child);
      }
    } else {
      buckets[item.section].push(item);
    }
  }

  return buckets;
}