import { Routes, Route } from "react-router-dom";
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

const adminPages: Record<string, { title: string; description?: string }> = {
  "": { title: "Dashboard", description: "Overview of your business" },
  bookings: { title: "Bookings", description: "Manage customer bookings" },
  customers: { title: "Customer Management", description: "View and manage customers" },
  "customers/:id": { title: "Customer Detail" },
  services: { title: "Services", description: "Manage service catalog" },
  inventory: { title: "Inventory", description: "Manage tire inventory" },
  marketing: { title: "Marketing", description: "Marketing campaigns" },
  loyalty: { title: "Loyalty Program", description: "Manage loyalty points" },
  rewards: { title: "Rewards", description: "Manage reward catalog" },
};

const Admin = () => {
  return (
    <Routes>
      <Route index element={<AdminLayout title="Dashboard" description="Overview of your business"><AdminDashboard /></AdminLayout>} />
      <Route path="bookings" element={<AdminLayout title="Bookings" description="Manage customer bookings"><BookingsManager /></AdminLayout>} />
      <Route path="customers" element={<AdminLayout title="Customer Management" description="View and manage customers"><CustomerList /></AdminLayout>} />
      <Route path="customers/:id" element={<AdminLayout title="Customer Detail"><CustomerDetail /></AdminLayout>} />
      <Route path="services" element={<AdminLayout title="Services" description="Manage service catalog"><ServiceManager /></AdminLayout>} />
      <Route path="inventory" element={<AdminLayout title="Inventory" description="Manage tire inventory"><InventoryDashboard /></AdminLayout>} />
      <Route path="marketing" element={<AdminLayout title="Marketing" description="Marketing campaigns"><MarketingDashboard /></AdminLayout>} />
      <Route path="loyalty" element={<AdminLayout title="Loyalty Program" description="Manage loyalty points"><><LoyaltyAnalytics /><LoyaltyPointsManager /></></AdminLayout>} />
      <Route path="rewards" element={<AdminLayout title="Rewards" description="Manage reward catalog"><RewardsManager /></AdminLayout>} />
    </Routes>
  );
};

export default Admin;
