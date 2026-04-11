import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, Megaphone, CalendarCheck, LayoutGrid,
  Trophy, Gift, ShieldCheck, Clock, ChevronDown, UserCheck,
  CreditCard, TrendingUp, Wallet, Car,
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
  requiredRole?: "staff";
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { title: "Confirmation", url: "/dashboard/bookings", icon: CalendarCheck },
  { title: "Customers", url: "/dashboard/customers", icon: Users },
  { title: "Vehicles", url: "/dashboard/customers", icon: Car, requiredRole: "staff" },
  { title: "Inventory", url: "/dashboard/inventory", icon: Package, requiredRole: "staff" },
  {
    title: "Marketing",
    url: "/dashboard/marketing",
    icon: Megaphone,
    requiredRole: "staff",
    children: [
      { title: "Overview", url: "/dashboard/marketing", icon: Megaphone },
      { title: "Services", url: "/dashboard/marketing/services", icon: LayoutGrid },
      { title: "Loyalty", url: "/dashboard/marketing/loyalty", icon: Trophy },
      { title: "Rewards", url: "/dashboard/marketing/rewards", icon: Gift },
    ],
  },
  { title: "User Verification", url: "/dashboard/user-verification", icon: UserCheck },
  { title: "Users & Roles", url: "/dashboard/users", icon: ShieldCheck, requiredRole: "staff" },
  { title: "Transaction History", url: "/dashboard/history", icon: Clock },
  { title: "Payments", url: "/dashboard/payments", icon: CreditCard },
  { title: "Financial Report", url: "/dashboard/reports", icon: TrendingUp, requiredRole: "staff" },
  { title: "Keuangan", url: "/dashboard/keuangan", icon: Wallet },
];

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isStaff } = useUserRole();
  const [pendingCount, setPendingCount] = useState(0);
  const [unverifiedCount, setUnverifiedCount] = useState(0);

  // Fetch pending bookings count + realtime
  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingCount(count || 0);
    };
    const fetchUnverified = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_verified", false);
      setUnverifiedCount(count || 0);
    };
    fetchPending();
    fetchUnverified();

    const channel = supabase
      .channel("sidebar-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchPending();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchUnverified();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const isActive = (url: string) => {
    if (url === "/dashboard") return location.pathname === "/dashboard";
    if (url === "/dashboard/marketing") return location.pathname === "/dashboard/marketing";
    return location.pathname.startsWith(url);
  };

  const isMarketingSection = location.pathname.startsWith("/dashboard/marketing");
  const [marketingOpen, setMarketingOpen] = useState(isMarketingSection);

  const visibleItems = menuItems.filter((item) => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === "staff") return isStaff;
    return false;
  });

  const isDashboardActive = location.pathname === "/dashboard";

  const renderItem = (item: MenuItem) => {
    if (item.children) {
      return (
        <Collapsible
          key={item.title}
          open={marketingOpen || isMarketingSection}
          onOpenChange={setMarketingOpen}
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                className={cn(
                  "cursor-pointer transition-all duration-200 w-full justify-between",
                  isMarketingSection
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted/60"
                )}
              >
                <span className="flex items-center gap-2">
                  <item.icon className={cn("h-4 w-4", isMarketingSection && "text-primary")} />
                  {!collapsed && <span>{item.title}</span>}
                </span>
                {!collapsed && (
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    (marketingOpen || isMarketingSection) && "rotate-180"
                  )} />
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
          </SidebarMenuItem>
          <CollapsibleContent className="transition-all duration-200">
            {!collapsed && item.children.map((child) => (
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
                  <span>{child.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    const showBadge = (item.title === "Confirmation" && pendingCount > 0) || (item.title === "User Verification" && unverifiedCount > 0);
    const badgeCount = item.title === "Confirmation" ? pendingCount : item.title === "User Verification" ? unverifiedCount : 0;

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
            {showBadge && (
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
