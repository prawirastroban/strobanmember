import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Megaphone, CalendarCheck, LayoutGrid,
  Trophy, Gift, ShieldCheck, Clock, ChevronDown, UserCheck,
  CreditCard, TrendingUp, Wallet, Car, FlaskConical, Tag, MessageSquareWarning, CalendarClock,
  Building2, BarChart2,
  Image as ImageIcon,
  FileBarChart, FileText, ShoppingBag, FileCheck2, Share2,
  ShieldAlert,
  Truck,
  Bug,
  Download,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  // 'owner' = staff enum (full access only)
  // 'no_branch' = anyone except admin_cabang (branch-scoped admins)
  requiredRole?: "owner" | "no_branch";
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { title: "Confirmation Bookings", url: "/dashboard/bookings", icon: CalendarCheck },
  {
    title: "CRM",
    url: "/dashboard/crm",
    icon: BarChart2,
    children: [
      { title: "Overview", url: "/dashboard/crm", icon: BarChart2 },
      { title: "Keluhan Kendaraan", url: "/dashboard/complaints", icon: MessageSquareWarning },
    ],
  },
  { title: "Kapasitas Slot", url: "/dashboard/slots", icon: CalendarClock },
  { title: "Customers & Vehicles", url: "/dashboard/customers", icon: Users },
  { title: "Pengaturan Cabang", url: "/dashboard/branches", icon: Building2, requiredRole: "owner" },
  { title: "Pick-up Service", url: "/dashboard/pickup-settings", icon: Truck, requiredRole: "owner" },
  {
    title: "Marketing",
    url: "/dashboard/marketing",
    icon: Megaphone,
    requiredRole: "owner",
    children: [
      { title: "Overview", url: "/dashboard/marketing", icon: Megaphone },
      { title: "Services", url: "/dashboard/marketing/services", icon: LayoutGrid },
      { title: "Promos", url: "/dashboard/marketing/promos", icon: Tag },
      { title: "Loyalty", url: "/dashboard/marketing/loyalty", icon: Trophy },
      { title: "Rewards", url: "/dashboard/marketing/rewards", icon: Gift },
      { title: "Branding & Logo", url: "/dashboard/marketing/branding", icon: ImageIcon },
    ],
  },
  { title: "Transaction History", url: "/dashboard/history", icon: Clock },
  {
    title: "Daftar Laporan",
    url: "/dashboard/reports",
    icon: FileBarChart,
    children: [
      { title: "Overview", url: "/dashboard/reports", icon: FileBarChart },
      { title: "Penjualan & Booking", url: "/dashboard/reports/sales", icon: ShoppingBag },
      { title: "Keuangan", url: "/dashboard/reports/finance", icon: Wallet },
      { title: "Pembayaran", url: "/dashboard/reports/payments", icon: CreditCard },
      { title: "Pelanggan (CRM)", url: "/dashboard/reports/customers", icon: Users },
      { title: "Kendaraan & Servis", url: "/dashboard/reports/vehicles", icon: Car },
      { title: "Loyalty & Rewards", url: "/dashboard/reports/loyalty", icon: Trophy },
      { title: "Promo & Voucher", url: "/dashboard/reports/promos", icon: Tag },
      { title: "Operasional Cabang", url: "/dashboard/reports/operations", icon: Building2 },
    ],
  },
  {
    title: "Keuangan",
    url: "/dashboard/keuangan",
    icon: Wallet,
    children: [
      { title: "Financial Report", url: "/dashboard/keuangan/report", icon: TrendingUp, requiredRole: "no_branch" },
      { title: "Payments", url: "/dashboard/keuangan/payment", icon: CreditCard },
      { title: "Pembayaran Manual", url: "/dashboard/keuangan/manual-payment", icon: FileCheck2, requiredRole: "owner" },
      { title: "Referral & Komisi", url: "/dashboard/keuangan/referral", icon: Share2, requiredRole: "owner" },
    ],
  },
  { title: "Legal & Dokumen", url: "/dashboard/legal", icon: FileText, requiredRole: "owner" },
  { title: "Audit Log", url: "/dashboard/audit-log", icon: ShieldAlert, requiredRole: "owner" },
  { title: "Permintaan Koreksi", url: "/dashboard/correction-requests", icon: ShieldAlert, requiredRole: "owner" },
  { title: "Bug & Masukan", url: "/dashboard/feedback", icon: Bug },
  { title: "PWA & Install", url: "/dashboard/pwa-settings", icon: Download, requiredRole: "owner" },
];

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isStaff, isAdminCabang, userBranch } = useUserRole();
  const [counts, setCounts] = useState({
    pendingBookings: 0,
    newComplaints: 0,
    pendingPayments: 0,
    unverifiedUsers: 0,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      const [bookingsRes, complaints, paymentsRes, users] = await Promise.all([
        // Pending bookings OR cancel requested (action needed for staff)
        supabase
          .from("bookings")
          .select("id, status, cancel_requested")
          .or("status.eq.pending,status.eq.waiting_confirmation,cancel_requested.eq.true"),
        supabase.from("vehicle_complaints").select("*", { count: "exact", head: true }).eq("status", "new"),
        // Pending payments — exclude those whose booking is cancelled/completed
        supabase
          .from("payments")
          .select("id, payment_status, bookings!inner(status)")
          .eq("payment_status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_verified", false),
      ]);

      const pendingBookings = (bookingsRes.data || []).length;
      const pendingPayments = (paymentsRes.data || []).filter((p: any) => {
        const s = p?.bookings?.status;
        return s !== "cancelled" && s !== "completed";
      }).length;

      setCounts({
        pendingBookings,
        newComplaints: complaints.count || 0,
        pendingPayments,
        unverifiedUsers: users.count || 0,
      });
    };
    fetchCounts();

    const channel = supabase
      .channel("sidebar-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_complaints" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchCounts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const badgeFor = (url: string): number => {
    switch (url) {
      case "/dashboard/bookings": return counts.pendingBookings;
      case "/dashboard/complaints": return counts.newComplaints;
      case "/dashboard/customers": return counts.unverifiedUsers;
      case "/dashboard/keuangan":
      case "/dashboard/keuangan/payment": return counts.pendingPayments;
      default: return 0;
    }
  };

  const isActive = (url: string) => {
    if (url === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname === url;
  };

  const isInSection = (url: string) => location.pathname.startsWith(url);

  const isMarketingSection = isInSection("/dashboard/marketing");
  const isKeuanganSection = isInSection("/dashboard/keuangan");
  const isReportsSection = isInSection("/dashboard/reports");

  const [marketingOpen, setMarketingOpen] = useState(isMarketingSection);
  const [keuanganOpen, setKeuanganOpen] = useState(isKeuanganSection);
  const [reportsOpen, setReportsOpen] = useState(isReportsSection);

  const passesRole = (req?: "owner" | "no_branch") => {
    if (!req) return true;
    if (req === "owner") return isStaff;
    if (req === "no_branch") return !isAdminCabang;
    return false;
  };

  const visibleItems = useMemo(() => menuItems
    .filter((item) => passesRole(item.requiredRole))
    .map((item) => item.children
      ? { ...item, children: item.children.filter((c) => passesRole(c.requiredRole)) }
      : item
    )
    .filter((item) => !item.children || item.children.length > 0),
  [isStaff, isAdminCabang]);

  const isDashboardActive = location.pathname === "/dashboard";

  const renderCollapsible = (
    item: MenuItem,
    isOpen: boolean,
    setIsOpen: (v: boolean) => void,
    isSectionActive: boolean,
  ) => {
    const sectionBadge = (item.children || []).reduce((sum, c) => sum + badgeFor(c.url), 0);
    const sectionExpanded = isOpen || isSectionActive;
    return (
    <Collapsible key={item.title} open={sectionExpanded} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className={cn(
              "cursor-pointer transition-all duration-200 w-full justify-between",
              isSectionActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60"
            )}
          >
            <span className="flex items-center gap-2">
              <span className="relative">
                <item.icon className={cn("h-4 w-4", isSectionActive && "text-primary")} />
                {sectionBadge > 0 && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                    {sectionBadge > 9 ? "9+" : sectionBadge}
                  </span>
                )}
              </span>
              {!collapsed && <span>{item.title}</span>}
              {!collapsed && sectionBadge > 0 && !sectionExpanded && (
                <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {sectionBadge > 9 ? "9+" : sectionBadge}
                </span>
              )}
            </span>
            {!collapsed && (
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                sectionExpanded && "rotate-180"
              )} />
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
      </SidebarMenuItem>
      <CollapsibleContent className="transition-all duration-200">
        {!collapsed && item.children?.map((child) => {
          const childBadge = badgeFor(child.url);
          return (
          <SidebarMenuItem key={child.title}>
            <SidebarMenuButton
              onClick={() => navigate(child.url)}
              className={cn(
                "cursor-pointer transition-all duration-200 pl-8 h-9 text-sm",
                isActive(child.url)
                  ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                  : "hover:bg-muted/60"
              )}
            >
              <child.icon className={cn("h-3.5 w-3.5", isActive(child.url) && "text-primary")} />
              <span className="flex items-center justify-between flex-1">
                <span>{child.title}</span>
                {childBadge > 0 && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {childBadge > 9 ? "9+" : childBadge}
                  </span>
                )}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
    );
  };

  const renderItem = (item: MenuItem) => {
    if (item.children && item.title === "Marketing") {
      return renderCollapsible(item, marketingOpen, setMarketingOpen, isMarketingSection);
    }
    if (item.children && item.title === "Keuangan") {
      return renderCollapsible(item, keuanganOpen, setKeuanganOpen, isKeuanganSection);
    }
    if (item.children && item.title === "Daftar Laporan") {
      return renderCollapsible(item, reportsOpen, setReportsOpen, isReportsSection);
    }

    const badgeCount = badgeFor(item.url);
    const showBadge = badgeCount > 0;

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          onClick={() => navigate(item.url)}
          className={cn(
            "cursor-pointer transition-all duration-200 relative",
            isActive(item.url)
              ? "bg-primary/10 text-primary font-medium shadow-[0_0_8px_hsl(var(--primary)/0.2)] border-l-2 border-primary"
              : "hover:bg-muted/60"
          )}
        >
          <span className="relative">
            <item.icon className={cn("h-4 w-4", isActive(item.url) && "text-primary")} />
            {showBadge && collapsed && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            )}
          </span>
          {!collapsed && (
            <span className="flex items-center justify-between flex-1">
              <span>{item.title}</span>
              {showBadge && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {badgeCount}
                </span>
              )}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r top-16 h-[calc(100vh-4rem)]">
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && "Dashboard Panel"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdminCabang && userBranch && !collapsed && (
                <li className="px-3 py-1.5 mx-2 mb-1 rounded-md bg-orange-500/10 border border-orange-500/30">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                    <Building2 className="h-3 w-3" />
                    Cabang: {userBranch}
                  </div>
                </li>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/dashboard")}
                  className={cn(
                    "cursor-pointer transition-all duration-200 h-10",
                    isDashboardActive
                      ? "bg-primary/10 text-primary font-semibold shadow-[0_0_10px_hsl(var(--primary)/0.25)] border-l-2 border-primary"
                      : "hover:bg-muted/60"
                  )}
                >
                  <LayoutDashboard className={cn("h-5 w-5", isDashboardActive && "text-primary")} />
                  {!collapsed && <span className="text-sm font-medium">Dashboard</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <li className="px-2 py-1.5">
                <Separator className="bg-border/50" />
              </li>

              {visibleItems.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
