import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/components/admin/AdminDashboard";
import BookingsManager from "@/components/admin/BookingsManager";
import CustomerList from "@/components/admin/CustomerList";
import CustomerDetail from "@/components/admin/CustomerDetail";
import ServiceManager from "@/components/admin/ServiceManager";
import MarketingOverview from "@/components/admin/MarketingOverview";
import LoyaltyPointsManager from "@/components/admin/LoyaltyPointsManager";
import LoyaltyAnalytics from "@/components/admin/LoyaltyAnalytics";
import RewardsManager from "@/components/admin/RewardsManager";
import PromosManager from "@/components/admin/PromosManager";
import TransactionHistory from "@/components/admin/TransactionHistory";
import PaymentsManager from "@/components/admin/PaymentsManager";
import FinancialReport from "@/components/admin/FinancialReport";
import FinanceDashboard from "@/components/admin/FinanceDashboard";
import TestTransactions from "@/components/admin/TestTransactions";
import ComplaintsManager from "@/components/admin/ComplaintsManager";
import SlotsManager from "@/components/admin/SlotsManager";
import CRMDashboard from "@/components/admin/CRMDashboard";
import BranchManager from "@/components/admin/BranchManager";
import BrandingManager from "@/components/admin/BrandingManager";
import { useUserRole } from "@/hooks/useUserRole";
import ReportsOverview from "@/components/admin/reports/ReportsOverview";
import ReportCategoryPage from "@/components/admin/reports/ReportCategoryPage";
import ReportDetailPage from "@/components/admin/reports/ReportDetailPage";

// Owner-only (DB enum 'staff' = full-access Owner)
const OwnerOnly = ({ children }: { children: React.ReactNode }) => {
  const { isStaff, isLoading } = useUserRole();
  if (isLoading) return null;
  if (!isStaff) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
// Owner + CS (anyone except branch-scoped admin_cabang)
const NoBranchOnly = ({ children }: { children: React.ReactNode }) => {
  const { isAdminCabang, isLoading } = useUserRole();
  if (isLoading) return null;
  if (isAdminCabang) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const Admin = () => {
  return (
    <Routes>
      <Route index element={<AdminLayout title="Overview" description="Overview of your business"><AdminDashboard /></AdminLayout>} />
      <Route path="bookings" element={<AdminLayout title="Bookings" description="Manage customer bookings"><BookingsManager /></AdminLayout>} />
      <Route path="crm" element={<AdminLayout title="CRM" description="Customer relationship & service performance"><CRMDashboard /></AdminLayout>} />
      <Route path="slots" element={<AdminLayout title="Kapasitas Slot" description="Atur kapasitas slot booking per cabang & tanggal"><SlotsManager /></AdminLayout>} />
      <Route path="complaints" element={<AdminLayout title="Keluhan Kendaraan" description="Keluhan & diagnosa dari pelanggan & guest"><ComplaintsManager /></AdminLayout>} />
      <Route path="customers" element={<AdminLayout title="Customer Management" description="View and manage customers"><CustomerList /></AdminLayout>} />
      <Route path="customers/:id" element={<AdminLayout title="Customer Detail"><CustomerDetail /></AdminLayout>} />
      <Route path="branches" element={<OwnerOnly><AdminLayout title="Pengaturan Cabang" description="Kelola lokasi cabang yang tampil di halaman publik /cabang"><BranchManager /></AdminLayout></OwnerOnly>} />
      {/* Inventory & User Roles removed — role changes are done from Customers & Vehicles */}
      <Route path="inventory" element={<Navigate to="/dashboard/customers" replace />} />
      <Route path="roles" element={<Navigate to="/dashboard/customers" replace />} />

      {/* Marketing hub — staff only */}
      <Route path="marketing" element={<OwnerOnly><AdminLayout title="Marketing" description="Marketing & Catalog Hub"><MarketingOverview /></AdminLayout></OwnerOnly>} />
      <Route path="marketing/services" element={<OwnerOnly><AdminLayout title="Services" description="Manage service catalog"><ServiceManager /></AdminLayout></OwnerOnly>} />
      <Route path="marketing/promos" element={<OwnerOnly><AdminLayout title="Promo & Voucher" description="Kelola promo yang tampil di halaman /promo"><PromosManager /></AdminLayout></OwnerOnly>} />
      <Route path="marketing/loyalty" element={<OwnerOnly><AdminLayout title="Loyalty Program" description="Manage loyalty points"><><LoyaltyAnalytics /><LoyaltyPointsManager /></></AdminLayout></OwnerOnly>} />
      <Route path="marketing/rewards" element={<OwnerOnly><AdminLayout title="Rewards" description="Manage reward catalog"><RewardsManager /></AdminLayout></OwnerOnly>} />
      <Route path="marketing/branding" element={<OwnerOnly><AdminLayout title="Branding & Logo" description="Kelola logo, favicon, dan nama brand aplikasi"><BrandingManager /></AdminLayout></OwnerOnly>} />
      <Route path="branding" element={<Navigate to="/dashboard/marketing/branding" replace />} />

      {/* Legacy redirects */}
      <Route path="services" element={<Navigate to="/dashboard/marketing/services" replace />} />
      <Route path="loyalty" element={<Navigate to="/dashboard/marketing/loyalty" replace />} />
      <Route path="rewards" element={<Navigate to="/dashboard/marketing/rewards" replace />} />

      {/* Legacy redirects — User Verification & Roles merged into Customer Management */}
      <Route path="user-verification" element={<Navigate to="/dashboard/customers" replace />} />
      <Route path="users" element={<Navigate to="/dashboard/customers" replace />} />
      <Route path="history" element={<AdminLayout title="Transaction History" description="Full activity log"><TransactionHistory /></AdminLayout>} />

      {/* Daftar Laporan (Reports Hub) */}
      <Route path="reports" element={<AdminLayout title="Daftar Laporan" description="Pusat laporan analitik & ekspor data"><ReportsOverview /></AdminLayout>} />
      <Route path="reports/:category" element={<AdminLayout title="Daftar Laporan"><ReportCategoryPage /></AdminLayout>} />
      <Route path="reports/:category/:id" element={<AdminLayout title="Daftar Laporan"><ReportDetailPage /></AdminLayout>} />

      {/* Keuangan sub-routes — Owner + CS (no branch-scoped) */}
      <Route path="keuangan/report" element={<NoBranchOnly><AdminLayout title="Financial Report" description="Revenue & payment analytics"><FinancialReport /></AdminLayout></NoBranchOnly>} />
      <Route path="keuangan/payment" element={<AdminLayout title="Payments" description="Manage all payments"><PaymentsManager /></AdminLayout>} />

      {/* Legacy redirects for old routes */}
      <Route path="payments" element={<Navigate to="/dashboard/keuangan/payment" replace />} />
      <Route path="reports" element={<Navigate to="/dashboard/keuangan/report" replace />} />
      <Route path="keuangan" element={<Navigate to="/dashboard/keuangan/report" replace />} />

      {/* Test Transactions — Owner only */}
      <Route path="test-transactions" element={<OwnerOnly><AdminLayout title="Test Transactions" description="One-click Midtrans sandbox testing"><TestTransactions /></AdminLayout></OwnerOnly>} />
    </Routes>
  );
};

export default Admin;
