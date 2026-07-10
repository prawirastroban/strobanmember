// Phase 5.3 — SPKDetail renders the Digital SPK Canvas (paper-aligned)
// inside the /dashboard shell (AdminLayout) so sidebar, topbar tabs, and
// breadcrumb tetap tampil konsisten dengan halaman admin lainnya.
import AdminLayout from "@/components/admin/AdminLayout";
import SPKCanvas from "./SPKCanvas";

export default function SPKDetail() {
  return (
    <AdminLayout title="SPK Detail" description="Digital Service Report">
      <SPKCanvas />
    </AdminLayout>
  );
}