import { useState, useCallback, useRef, useEffect } from "react";
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
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <SidebarProvider>
        <div className="flex-1 flex w-full overflow-hidden">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-9 flex items-center border-b border-border/50 px-4 shrink-0 bg-background/80 backdrop-blur-md">
              <SidebarTrigger className="mr-3" />
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold">{title}</h1>
                {description && (
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">— {description}</span>
                )}
              </div>
            </header>
            <main className="flex-1 p-3 md:p-5 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AdminLayout;
