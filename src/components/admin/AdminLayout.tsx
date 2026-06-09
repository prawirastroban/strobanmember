import { SidebarProvider } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import Navbar from "@/components/Navbar";
import DashboardTopbar from "./DashboardTopbar";
import { DashboardTabsProvider } from "@/contexts/DashboardTabsContext";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const AdminLayout = ({ children, title, description }: AdminLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <SidebarProvider>
        <DashboardTabsProvider>
          <div className="flex-1 flex w-full overflow-hidden">
            <AdminSidebar />
            <div className="flex-1 flex flex-col min-w-0 bg-dashboard-bg">
              <DashboardTopbar title={title} />
              {description && (
                <div className="px-4 md:px-5 pt-3 pb-1 shrink-0">
                  <h1 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
              )}
              <main data-dashboard-content className="flex-1 p-3 md:p-5 overflow-auto animate-in fade-in duration-200">
                {children}
              </main>
            </div>
          </div>
        </DashboardTabsProvider>
      </SidebarProvider>
    </div>
  );
};

export default AdminLayout;
