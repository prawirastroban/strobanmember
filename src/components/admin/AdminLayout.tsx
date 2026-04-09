import { useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const AdminLayout = ({ children, title, description }: AdminLayoutProps) => {
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const isMobile = useIsMobile();

  const handleScroll = useCallback(() => {
    if (isMobile) return;
    const main = document.getElementById("dashboard-main");
    if (!main) return;
    const y = main.scrollTop;
    if (y > lastScrollY && y > 60) {
      setHeaderVisible(false);
    } else {
      setHeaderVisible(true);
    }
    setLastScrollY(y);
  }, [lastScrollY, isMobile]);

  useEffect(() => {
    const main = document.getElementById("dashboard-main");
    if (!main) return;
    main.addEventListener("scroll", handleScroll, { passive: true });
    return () => main.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <SidebarProvider>
        <div className="min-h-[calc(100vh-64px)] flex w-full">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header
              className={cn(
                "h-10 flex items-center border-b border-border/50 px-4 shrink-0 transition-all duration-300 ease-out bg-background/80 backdrop-blur-md z-10",
                !headerVisible && !isMobile && "-translate-y-full h-0 opacity-0 border-none overflow-hidden"
              )}
            >
              <SidebarTrigger className="mr-3" />
              <div>
                <h1 className="text-sm font-semibold">{title}</h1>
                {description && (
                  <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
                )}
              </div>
            </header>
            <main id="dashboard-main" className="flex-1 p-4 md:p-5 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AdminLayout;
