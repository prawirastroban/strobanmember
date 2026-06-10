import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ChevronDown, Building2,
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
import { useDashboardBadges } from "@/hooks/useDashboardBadges";
import {
  getSidebarSections,
  SECTION_META,
  type MenuItem,
} from "@/config/dashboardMenu";
import { trackMenuClick } from "@/hooks/useMenuUsage";

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isStaff, isAdminCabang, userBranch } = useUserRole();
  const { badgeFor } = useDashboardBadges();

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

  const sidebarSections = useMemo(
    () => getSidebarSections({ isStaff, isAdminCabang }),
    [isStaff, isAdminCabang],
  );

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
              "cursor-pointer transition-all duration-200 w-full justify-between !overflow-visible",
              isSectionActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60"
            )}
          >
            <span className="flex items-center gap-2">
              <span className="relative">
                <item.icon className={cn("h-4 w-4", isSectionActive && "text-primary")} />
                {sectionBadge > 0 && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
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
              onClick={() => { trackMenuClick(child.url); navigate(child.url); }}
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
          onClick={() => { trackMenuClick(item.url); navigate(item.url); }}
          className={cn(
            "cursor-pointer transition-all duration-200 relative !overflow-visible",
            isActive(item.url)
              ? "bg-primary/10 text-primary font-medium shadow-[0_0_8px_hsl(var(--primary)/0.2)] border-l-2 border-primary"
              : "hover:bg-muted/60"
          )}
        >
          <span className="relative">
            <item.icon className={cn("h-4 w-4", isActive(item.url) && "text-primary")} />
            {showBadge && collapsed && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
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
      <SidebarContent className="pt-2 group-data-[collapsible=icon]:!overflow-visible">
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sidebarSections.map(({ section, items }) => (
          <SidebarGroup key={section}>
            <SidebarGroupLabel>
              {!collapsed && SECTION_META[section].title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
