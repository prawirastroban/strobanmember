import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useDashboardTabs } from "@/contexts/DashboardTabsContext";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface Props {
  title: string;
}

const DashboardTopbar = ({ title }: Props) => {
  const navigate = useNavigate();
  const { tabs, activePath, openTab, closeTab } = useDashboardTabs();

  // Register current page as a tab on mount / title change
  useEffect(() => {
    openTab({ path: activePath, title });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath, title]);

  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-border/60 bg-background/80 backdrop-blur-md px-2 sm:px-3 h-11 shrink-0 overflow-hidden">
      <SidebarTrigger className="shrink-0" />
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.path === activePath;
          return (
            <div
              key={tab.path}
              className={cn(
                "group flex items-center gap-2 px-3 h-8 rounded-t-md text-xs sm:text-[13px] font-medium shrink-0 cursor-pointer transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-[hsl(var(--tab-inactive-bg))] text-[hsl(var(--tab-inactive-fg))] hover:bg-[hsl(var(--tab-inactive-bg))]/80"
              )}
              onClick={() => navigate(tab.path)}
            >
              <span className="truncate max-w-[140px] sm:max-w-[180px]">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.path); }}
                  className={cn(
                    "rounded-sm p-0.5 transition-opacity",
                    isActive ? "hover:bg-white/20 opacity-90" : "hover:bg-black/10 opacity-60 group-hover:opacity-100",
                  )}
                  aria-label={`Close ${tab.title}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardTopbar;