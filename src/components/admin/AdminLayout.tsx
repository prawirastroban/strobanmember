import { SidebarProvider } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import Navbar from "@/components/Navbar";
import DashboardTopbar from "./DashboardTopbar";
import { DashboardTabsProvider } from "@/contexts/DashboardTabsContext";
import Breadcrumbs from "./drill/Breadcrumbs";
import AppVersionBadge from "@/components/AppVersionBadge";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const AdminLayout = ({ children, title, description }: AdminLayoutProps) => {
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <div className="shrink-0">
        <Navbar />
      </div>
      <SidebarProvider>
        <DashboardTabsProvider>
          <div className="flex-1 flex w-full overflow-hidden min-h-0">
            <AdminSidebar />
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-dashboard-bg">
              <DashboardTopbar title={title} />
              <div className="px-4 md:px-5 pt-3 pb-2 shrink-0 space-y-1.5">
                <Breadcrumbs />
                {description && (
                  <div>
                    <h1 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                )}
              </div>
              <main data-dashboard-content className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain animate-in fade-in duration-200">
                <div className="p-3 md:p-5 pb-32 md:pb-24">
                  {children}
                </div>
                <footer className="px-4 md:px-5 py-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>© {new Date().getFullYear()} Sahabat Stroban Service</span>
                  <AppVersionBadge variant="inline" />
                </footer>
              </main>
            </div>
          </div>
        </DashboardTabsProvider>
      </SidebarProvider>
    </div>
  );
};

export default AdminLayout;
