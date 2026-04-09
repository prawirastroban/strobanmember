import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import Navbar from "@/components/Navbar";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const AdminLayout = ({ children, title, description }: AdminLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <SidebarProvider>
        <div className="min-h-[calc(100vh-64px)] flex w-full">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-12 flex items-center border-b px-4 shrink-0">
              <SidebarTrigger className="mr-3" />
              <div>
                <h1 className="text-lg font-semibold">{title}</h1>
                {description && (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}
              </div>
            </header>
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AdminLayout;
