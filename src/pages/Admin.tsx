import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/components/admin/AdminDashboard";
import BookingsManager from "@/components/admin/BookingsManager";
import CustomerList from "@/components/admin/CustomerList";
import CustomerDetail from "@/components/admin/CustomerDetail";
import ServiceManager from "@/components/admin/ServiceManager";
import InventoryDashboard from "@/components/staff/InventoryDashboard";
import MarketingDashboard from "@/components/staff/MarketingDashboard";
import LoyaltyPointsManager from "@/components/admin/LoyaltyPointsManager";
import LoyaltyAnalytics from "@/components/admin/LoyaltyAnalytics";
import RewardsManager from "@/components/admin/RewardsManager";
import UserRolesManager from "@/components/admin/UserRolesManager";
import { useUserRole } from "@/hooks/useUserRole";

const StaffOnly = ({ children }: { children: React.ReactNode }) => {
  const { isStaff, isLoading } = useUserRole();
  if (isLoading) return null;
  if (!isStaff) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const Admin = () => {
  return (
    <Routes>
      <Route index element={<AdminLayout title="Overview" description="Overview of your business"><AdminDashboard /></AdminLayout>} />
      <Route path="bookings" element={<AdminLayout title="Bookings" description="Manage customer bookings"><BookingsManager /></AdminLayout>} />
      <Route path="customers" element={<AdminLayout title="Customer Management" description="View and manage customers"><CustomerList /></AdminLayout>} />
      <Route path="customers/:id" element={<AdminLayout title="Customer Detail"><CustomerDetail /></AdminLayout>} />
      <Route path="services" element={<AdminLayout title="Services" description="Manage service catalog"><ServiceManager /></AdminLayout>} />
      <Route path="inventory" element={<StaffOnly><AdminLayout title="Inventory" description="Manage tire inventory"><InventoryDashboard /></AdminLayout></StaffOnly>} />
      <Route path="marketing" element={<StaffOnly><AdminLayout title="Marketing" description="Marketing campaigns"><MarketingDashboard /></AdminLayout></StaffOnly>} />
      <Route path="loyalty" element={<AdminLayout title="Loyalty Program" description="Manage loyalty points"><><LoyaltyAnalytics /><LoyaltyPointsManager /></></AdminLayout>} />
      <Route path="rewards" element={<AdminLayout title="Rewards" description="Manage reward catalog"><RewardsManager /></AdminLayout>} />
      <Route path="users" element={<StaffOnly><AdminLayout title="Users & Roles" description="Manage user roles"><UserRolesManager /></AdminLayout></StaffOnly>} />
    </Routes>
  );
};

export default Admin;
