import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/components/admin/AdminDashboard";
import BookingsManager from "@/components/admin/BookingsManager";
import CustomerList from "@/components/admin/CustomerList";
import CustomerDetail from "@/components/admin/CustomerDetail";
import ServiceManager from "@/components/admin/ServiceManager";
import InventoryDashboard from "@/components/staff/InventoryDashboard";
import MarketingOverview from "@/components/admin/MarketingOverview";
import LoyaltyPointsManager from "@/components/admin/LoyaltyPointsManager";
import LoyaltyAnalytics from "@/components/admin/LoyaltyAnalytics";
import RewardsManager from "@/components/admin/RewardsManager";
import PromosManager from "@/components/admin/PromosManager";
import UserRolesManager from "@/components/admin/UserRolesManager";
import TransactionHistory from "@/components/admin/TransactionHistory";
import UserVerification from "@/components/admin/UserVerification";
import PaymentsManager from "@/components/admin/PaymentsManager";
import FinancialReport from "@/components/admin/FinancialReport";
import FinanceDashboard from "@/components/admin/FinanceDashboard";
import TestTransactions from "@/components/admin/TestTransactions";
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
      <Route path="inventory" element={<StaffOnly><AdminLayout title="Inventory" description="Manage tire inventory"><InventoryDashboard /></AdminLayout></StaffOnly>} />

      {/* Marketing hub — staff only */}
      <Route path="marketing" element={<StaffOnly><AdminLayout title="Marketing" description="Marketing & Catalog Hub"><MarketingOverview /></AdminLayout></StaffOnly>} />
      <Route path="marketing/services" element={<StaffOnly><AdminLayout title="Services" description="Manage service catalog"><ServiceManager /></AdminLayout></StaffOnly>} />
      <Route path="marketing/promos" element={<StaffOnly><AdminLayout title="Promo & Voucher" description="Kelola promo yang tampil di halaman /promo"><PromosManager /></AdminLayout></StaffOnly>} />
      <Route path="marketing/loyalty" element={<StaffOnly><AdminLayout title="Loyalty Program" description="Manage loyalty points"><><LoyaltyAnalytics /><LoyaltyPointsManager /></></AdminLayout></StaffOnly>} />
      <Route path="marketing/rewards" element={<StaffOnly><AdminLayout title="Rewards" description="Manage reward catalog"><RewardsManager /></AdminLayout></StaffOnly>} />

      {/* Legacy redirects */}
      <Route path="services" element={<Navigate to="/dashboard/marketing/services" replace />} />
      <Route path="loyalty" element={<Navigate to="/dashboard/marketing/loyalty" replace />} />
      <Route path="rewards" element={<Navigate to="/dashboard/marketing/rewards" replace />} />

      <Route path="user-verification" element={<AdminLayout title="User Verification" description="Verify new user accounts"><UserVerification /></AdminLayout>} />
      <Route path="users" element={<StaffOnly><AdminLayout title="Users & Roles" description="Manage user roles"><UserRolesManager /></AdminLayout></StaffOnly>} />
      <Route path="history" element={<AdminLayout title="Transaction History" description="Full activity log"><TransactionHistory /></AdminLayout>} />

      {/* Keuangan sub-routes — staff only */}
      <Route path="keuangan/report" element={<StaffOnly><AdminLayout title="Financial Report" description="Revenue & payment analytics"><FinancialReport /></AdminLayout></StaffOnly>} />
      <Route path="keuangan/payment" element={<StaffOnly><AdminLayout title="Payments" description="Manage all payments"><PaymentsManager /></AdminLayout></StaffOnly>} />

      {/* Legacy redirects for old routes */}
      <Route path="payments" element={<Navigate to="/dashboard/keuangan/payment" replace />} />
      <Route path="reports" element={<Navigate to="/dashboard/keuangan/report" replace />} />
      <Route path="keuangan" element={<Navigate to="/dashboard/keuangan/report" replace />} />

      {/* Test Transactions — staff only */}
      <Route path="test-transactions" element={<StaffOnly><AdminLayout title="Test Transactions" description="One-click Midtrans sandbox testing"><TestTransactions /></AdminLayout></StaffOnly>} />
    </Routes>
  );
};

export default Admin;
