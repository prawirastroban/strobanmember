import { useLocation, useNavigate } from "react-router-dom";
import { Home, Users, Package, Megaphone, CalendarCheck, LayoutGrid, Trophy, Gift, ShieldCheck } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { Separator } from "@/components/ui/separator";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: "staff";
}

const menuItems: MenuItem[] = [
  { title: "Bookings", url: "/dashboard/bookings", icon: CalendarCheck },
  { title: "Customers", url: "/dashboard/customers", icon: Users },
  { title: "Services", url: "/dashboard/services", icon: LayoutGrid },
  { title: "Inventory", url: "/dashboard/inventory", icon: Package, requiredRole: "staff" },
  { title: "Marketing", url: "/dashboard/marketing", icon: Megaphone, requiredRole: "staff" },
  { title: "Loyalty", url: "/dashboard/loyalty", icon: Trophy },
  { title: "Rewards", url: "/dashboard/rewards", icon: Gift },
  { title: "Users & Roles", url: "/dashboard/users", icon: ShieldCheck, requiredRole: "staff" },
];

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isStaff } = useUserRole();

  const visibleItems = menuItems.filter((item) => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === "staff") return isStaff;
    return false;
  });

  const isActive = (url: string) => {
    if (url === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(url);
  };

  const isDashboardActive = location.pathname === "/dashboard";

  return (
    <Sidebar collapsible="icon" className="border-r top-16 h-[calc(100vh-4rem)]">
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && "Dashboard Panel"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard Overview — always first */}
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
                  <Home className={cn("h-5 w-5", isDashboardActive && "text-primary")} />
                  {!collapsed && <span className="text-sm font-medium">Dashboard</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Separator */}
              <li className="px-2 py-1.5">
                <Separator className="bg-border/50" />
              </li>

              {/* Other menu items */}
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      isActive(item.url)
                        ? "bg-primary/10 text-primary font-medium shadow-[0_0_8px_hsl(var(--primary)/0.2)] border-l-2 border-primary"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", isActive(item.url) && "text-primary")} />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
