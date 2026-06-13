import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import BookingsManager from "@/components/admin/BookingsManager";
import CustomerList from "@/components/admin/CustomerList";
import CustomerDetail from "@/components/admin/CustomerDetail";
import ServiceManager from "@/components/admin/ServiceManager";
import LoyaltyPointsManager from "@/components/admin/LoyaltyPointsManager";
import LoyaltyHowToEarnEditor from "@/components/admin/LoyaltyHowToEarnEditor";
import RewardsManager from "@/components/admin/RewardsManager";
import PromosManager from "@/components/admin/PromosManager";
import HistoryHub from "@/components/admin/HistoryHub";
import TestTransactions from "@/components/admin/TestTransactions";
import ComplaintsManager from "@/components/admin/ComplaintsManager";
import SlotsManager from "@/components/admin/SlotsManager";
import BranchManager from "@/components/admin/BranchManager";
import BrandingManager from "@/components/admin/BrandingManager";
import ManualPaymentManager from "@/components/admin/keuangan/ManualPaymentManager";
import ReferralManager from "@/components/admin/keuangan/ReferralManager";
import LegalDocumentsManager from "@/components/admin/LegalDocumentsManager";
import AuditLogPanel from "@/components/admin/AuditLogPanel";
import CorrectionRequestsPanel from "@/components/admin/CorrectionRequestsPanel";
import { useUserRole } from "@/hooks/useUserRole";
import ReportsOverview from "@/components/admin/reports/ReportsOverview";
import ReportCategoryPage from "@/components/admin/reports/ReportCategoryPage";
import ReportDetailPage from "@/components/admin/reports/ReportDetailPage";
import ReportBuilderPage from "@/components/admin/reports/builder/ReportBuilderPage";
import PrintView from "@/components/admin/reports/PrintView";
import PickupSettingsCard from "@/components/admin/PickupSettingsCard";
import InternalReports from "@/components/admin/internal/InternalReports";
import FeedbackControlCenter from "@/components/admin/feedback/FeedbackControlCenter";
import PwaSettingsManager from "@/components/admin/PwaSettingsManager";
import AppVersionManager from "@/components/admin/AppVersionManager";
import PageAuditPanel from "@/components/admin/PageAuditPanel";
import SystemManagementHub from "@/components/admin/system/SystemManagementHub";
import ReleaseNotesManager from "@/components/admin/system/ReleaseNotesManager";

// Chart-heavy dashboards — lazy load to split recharts out of the main bundle
const AdminDashboard = lazy(() => import("@/components/admin/AdminDashboard"));
const MarketingOverview = lazy(() => import("@/components/admin/MarketingOverview"));
const LoyaltyAnalytics = lazy(() => import("@/components/admin/LoyaltyAnalytics"));
const FinancialReport = lazy(() => import("@/components/admin/FinancialReport"));
const CRMDashboard = lazy(() => import("@/components/admin/CRMDashboard"));
const WebAnalyticsDashboard = lazy(() => import("@/components/admin/analytics/WebAnalyticsDashboard"));

const DashFallback = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);
const Lz = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<DashFallback />}>{children}</Suspense>
);

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
      <Route index element={<AdminLayout title="Overview" description="Overview of your business"><Lz><AdminDashboard /></Lz></AdminLayout>} />
      <Route path="bookings" element={<AdminLayout title="Bookings" description="Manage customer bookings"><BookingsManager /></AdminLayout>} />
      <Route path="scanner" element={<Navigate to="/dashboard/bookings?action=scan" replace />} />
      <Route path="crm" element={<AdminLayout title="CRM" description="Customer relationship & service performance"><Lz><CRMDashboard /></Lz></AdminLayout>} />
      <Route path="slots" element={<AdminLayout title="Kapasitas Slot" description="Atur kapasitas slot booking per cabang & tanggal"><SlotsManager /></AdminLayout>} />
      <Route path="complaints" element={<AdminLayout title="Keluhan Kendaraan" description="Keluhan & diagnosa dari pelanggan & guest"><ComplaintsManager /></AdminLayout>} />
      <Route path="customers" element={<AdminLayout title="Customer Management" description="View and manage customers"><CustomerList /></AdminLayout>} />
      <Route path="customers/:id" element={<AdminLayout title="Customer Detail"><CustomerDetail /></AdminLayout>} />
      <Route path="branches" element={<OwnerOnly><AdminLayout title="Pengaturan Cabang" description="Kelola lokasi cabang yang tampil di halaman publik /cabang"><BranchManager /></AdminLayout></OwnerOnly>} />
      <Route path="pickup-settings" element={<OwnerOnly><AdminLayout title="Pick-up Service" description="Atur ketersediaan, jangkauan, dan biaya layanan jemput-antar"><PickupSettingsCard /></AdminLayout></OwnerOnly>} />
      {/* Inventory & User Roles removed — role changes are done from Customers & Vehicles */}
      <Route path="inventory" element={<Navigate to="/dashboard/customers" replace />} />
      <Route path="roles" element={<Navigate to="/dashboard/customers" replace />} />

      {/* Marketing hub — staff only */}
      <Route path="marketing" element={<OwnerOnly><AdminLayout title="Marketing" description="Marketing & Catalog Hub"><Lz><MarketingOverview /></Lz></AdminLayout></OwnerOnly>} />
      <Route path="marketing/services" element={<OwnerOnly><AdminLayout title="Services" description="Manage service catalog"><ServiceManager /></AdminLayout></OwnerOnly>} />
      <Route path="marketing/promos" element={<OwnerOnly><AdminLayout title="Promo & Voucher" description="Kelola promo yang tampil di halaman /promo"><PromosManager /></AdminLayout></OwnerOnly>} />
      <Route path="marketing/loyalty" element={<OwnerOnly><AdminLayout title="Loyalty Program" description="Manage loyalty points"><Lz><><LoyaltyAnalytics /><LoyaltyHowToEarnEditor /><LoyaltyPointsManager /></></Lz></AdminLayout></OwnerOnly>} />
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
      <Route path="history" element={<AdminLayout title="Pusat Histori" description="Booking, pembayaran, promo, loyalty, referral, service & timeline aktivitas"><HistoryHub /></AdminLayout>} />

      {/* Daftar Laporan (Reports Hub) */}
      <Route path="reports" element={<AdminLayout title="Daftar Laporan" description="Pusat laporan analitik & ekspor data"><ReportsOverview /></AdminLayout>} />
      <Route path="reports/builder" element={<AdminLayout title="Custom Report Builder" description="Susun laporan sendiri dengan pivot, calculated field & filter"><ReportBuilderPage /></AdminLayout>} />
      <Route path="reports/print/:id" element={<PrintView />} />
      <Route path="reports/:category" element={<AdminLayout title="Daftar Laporan"><ReportCategoryPage /></AdminLayout>} />
      <Route path="reports/:category/:id" element={<AdminLayout title="Daftar Laporan"><ReportDetailPage /></AdminLayout>} />

      {/* Web Analytics (Phase 1 skeleton) */}
      <Route path="analytics" element={<AdminLayout title="Web Analytics" description="Visitor, traffic, conversion & insight"><Lz><WebAnalyticsDashboard /></Lz></AdminLayout>} />

      {/* Keuangan sub-routes — Owner + CS (no branch-scoped) */}
      <Route path="keuangan/report" element={<NoBranchOnly><AdminLayout title="Financial Report" description="Revenue & payment analytics"><Lz><FinancialReport /></Lz></AdminLayout></NoBranchOnly>} />
      {/* Legacy → consolidated into Pusat Histori */}
      <Route path="keuangan/payment" element={<Navigate to="/dashboard/history?tab=payments" replace />} />
      <Route path="keuangan/manual-payment" element={<OwnerOnly><AdminLayout title="Pembayaran Manual" description="Kelola rekening, QRIS, dan verifikasi bukti transfer"><ManualPaymentManager /></AdminLayout></OwnerOnly>} />
      <Route path="keuangan/referral" element={<OwnerOnly><AdminLayout title="Referral & Komisi" description="Atur komisi, pencairan, voucher referral"><ReferralManager /></AdminLayout></OwnerOnly>} />

      {/* Legal & Pengaduan — Owner only */}
      <Route path="legal" element={<OwnerOnly><AdminLayout title="Legal & Dokumen" description="Kelola syarat & ketentuan, kebijakan, FAQ, dan pengaduan pelanggan"><LegalDocumentsManager /></AdminLayout></OwnerOnly>} />

      {/* Audit Log — Owner only */}
      <Route path="audit-log" element={<OwnerOnly><AdminLayout title="Audit Log" description="Catatan permanen aksi sensitif admin (immutable)"><AuditLogPanel /></AdminLayout></OwnerOnly>} />

      {/* Permintaan Koreksi Status — Owner only */}
      <Route path="correction-requests" element={<OwnerOnly><AdminLayout title="Permintaan Koreksi" description="Anti-fraud: tinjau & setujui permintaan koreksi status mundur dari CS / Admin Cabang"><CorrectionRequestsPanel /></AdminLayout></OwnerOnly>} />

      {/* Bug & Masukan — semua role internal (bukan customer) */}
      <Route path="feedback" element={<AdminLayout title="Pusat Kontrol Operasional" description="Monitoring real-time keluhan customer, error sistem, dan evaluasi cabang"><FeedbackControlCenter /></AdminLayout>} />
      <Route path="feedback/internal" element={<AdminLayout title="Bug & Masukan Internal" description="Laporan internal staff"><InternalReports /></AdminLayout>} />

      {/* PWA / Install Banner — Owner only */}
      <Route path="pwa-settings" element={<OwnerOnly><AdminLayout title="PWA & Install Banner" description="Kelola banner install aplikasi dan statistiknya"><PwaSettingsManager /></AdminLayout></OwnerOnly>} />

      {/* App Version Control — Owner only */}
      <Route path="app-version" element={<OwnerOnly><AdminLayout title="Versi Aplikasi" description="Kontrol versi global & paksa refresh client"><AppVersionManager /></AdminLayout></OwnerOnly>} />

      {/* System Management Center — Owner only */}
      <Route path="system-management" element={<OwnerOnly><AdminLayout title="System Management" description="Pusat kontrol versi, maintenance, sessions, cache & audit"><SystemManagementHub /></AdminLayout></OwnerOnly>} />
      <Route path="release-notes" element={<OwnerOnly><AdminLayout title="Release Notes" description="Catatan rilis & changelog aplikasi"><ReleaseNotesManager /></AdminLayout></OwnerOnly>} />

      {/* Page Audit (hidden) — Owner only */}
      <Route path="page-audit" element={<OwnerOnly><AdminLayout title="Audit Halaman" description="Status seluruh halaman: aktif, archived, deprecated, redirected"><PageAuditPanel /></AdminLayout></OwnerOnly>} />

      {/* Legacy redirects for old routes */}
      <Route path="payments" element={<Navigate to="/dashboard/keuangan/payment" replace />} />
      <Route path="reports" element={<Navigate to="/dashboard/keuangan/report" replace />} />
      <Route path="keuangan" element={<Navigate to="/dashboard/keuangan/report" replace />} />

      {/* Test Transactions — Owner only */}
      <Route path="test-transactions" element={<OwnerOnly><AdminLayout title="Test Transactions" description="One-click Midtrans sandbox testing"><TestTransactions /></AdminLayout></OwnerOnly>} />

      {/* Catch-all: route dashboard tak dikenal → kembali ke /dashboard (tanpa 404) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default Admin;
