import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Megaphone, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import InventoryDashboard from "@/components/staff/InventoryDashboard";
import MarketingDashboard from "@/components/staff/MarketingDashboard";
import UserRolesManager from "@/components/admin/UserRolesManager";

const StaffSetting = () => {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Staff Panel</h1>
          </div>
          <p className="text-muted-foreground">
            Internal tools for staff management
          </p>
        </div>

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="inventory" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Inventory</span>
              <span className="sm:hidden">Inv</span>
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Marketing</span>
              <span className="sm:hidden">Mkt</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 py-2.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users & Roles</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            <InventoryDashboard />
          </TabsContent>
          <TabsContent value="marketing">
            <MarketingDashboard />
          </TabsContent>
          <TabsContent value="users">
            <UserRolesManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StaffSetting;
