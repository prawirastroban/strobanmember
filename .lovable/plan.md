
## Objective
Bersihkan menu SPK: hapus **Template Builder** dan **Automation** dari UI, gabungkan **Analytics + Reports** menjadi satu halaman, dan pastikan **SPK Configuration** ikut disinkronkan dengan scope terbaru — semuanya tanpa mengganggu runtime SPK (SchemaBuilder, AutomationEngine, workflow, canvas).

## Prinsip Aman
- Runtime `SchemaBuilder` dan `AutomationBootstrap` (di `src/main.tsx`, `src/runtime/**`) **TIDAK dihapus** — mereka backbone form SPK & side-effects. Hanya halaman viewer/builder yang dihapus.
- Tabel database (`spk_form_templates`, `spk_form_template_versions`, `spk_form_conditional_rules`, dll.) **TIDAK di-drop** — masih menjadi sumber schema form runtime.
- Setiap route yang dihapus juga dibersihkan dari sidebar, dashboard hub, dan configuration panel agar tidak ada dead link.

## 1. Hapus Template Builder (UI saja)
- `src/pages/spk/admin/SPKTemplateBuilderPage.tsx` → delete file.
- `src/pages/Admin.tsx` → hapus import `SPKTemplateBuilderPage` + route `spk/templates`.
- `src/config/dashboardMenu.ts` → hapus entry `Template Builder`.
- `src/pages/spk/admin/SPKDomainDashboard.tsx` → hapus tile Template Builder.
- Runtime builder (`src/runtime/builder/*`) tetap ada — dipakai sebagai library internal untuk versi form aktif.

## 2. Hapus Automation Viewer (UI saja)
- `src/pages/spk/admin/SPKAutomationViewer.tsx` → delete file.
- `src/pages/Admin.tsx` → hapus import & route `spk/automation`.
- `src/config/dashboardMenu.ts` → hapus entry `Automation`.
- `src/pages/spk/admin/SPKDomainDashboard.tsx` → hapus tile Automation.
- `AutomationBootstrap` di `src/main.tsx` tetap aktif (engine tetap jalan di background untuk timeline events & auto-save).

## 3. Gabungkan Analytics + Reports → satu halaman "SPK Reports"
- Buat/refactor **`src/pages/spk/admin/SPKReportsPage.tsx`** menjadi halaman gabungan berisi 2 section:
  1. **KPI & Analytics** — pindahkan konten dari `SPKAnalyticsPage.tsx` (KPI cards, chart harian dari `spk_analytics_daily`).
  2. **Laporan & Export** — konten Reports existing (daftar SPK, filter periode/cabang/status, tombol Export CSV).
- Sinkron dengan flow yang ada:
  - Filter periode/cabang di-share antara Analytics section & Reports section (single state).
  - Data source tetap `SPKService` + `spk_analytics_daily` (tidak ada perubahan backend).
- `src/pages/spk/admin/SPKAnalyticsPage.tsx` → delete file.
- `src/pages/Admin.tsx`:
  - Hapus import `SPKAnalyticsPage`.
  - Hapus route `spk/analytics`, atau redirect ke `spk/reports` agar bookmark lama tidak 404.
- `src/config/dashboardMenu.ts` → hapus entry "Analytics", ganti label Reports menjadi **"Analytics & Reports"** (URL tetap `/dashboard/spk/reports`).
- `src/pages/spk/admin/SPKDomainDashboard.tsx` → hapus tile Analytics, update tile Reports menjadi "Analytics & Reports".

## 4. Sinkron SPK Configuration Panel
`src/components/admin/system/spk/SPKConfigurationPanel.tsx` masih punya tab **Automation** yang sekarang tidak relevan (UI viewernya dihapus, engine di-hard-code via bootstrap).
- Hapus tab **Automation**, komponen `AutomationEditor`, import `AutomationConfig`, `DEFAULT_AUTOMATION`, ikon `Zap` yang tidak dipakai lagi.
- Pastikan tidak ada tab yang menunjuk ke fitur yang sudah dihapus (Template/Workflow/Approval sudah dibersihkan sebelumnya — verifikasi ulang).
- Panel tersisa: **Role Profiles** (satu-satunya konfigurasi SPK yang perlu owner-editable).
- Tambahkan komentar header agar jelas panel ini hanya menampilkan konfigurasi yang masih relevan dengan flow SPK aktif.

## 5. Verifikasi
- `grep -r "spk/templates\|spk/automation\|spk/analytics\|SPKAnalyticsPage\|SPKTemplateBuilderPage\|SPKAutomationViewer"` harus bersih di `src/` kecuali komentar migrasi.
- Buka `/dashboard/spk` → hub menampilkan menu final: **Semua SPK · Reminders · Configuration · Analytics & Reports**.
- Buka `/dashboard/spk/reports` → tampilkan KPI + tabel + export dalam satu halaman.
- Buka `/dashboard/spk/configuration` → hanya tab Role Profiles.
- SPK Canvas / Queue / Approval flow tidak berubah (regression check ringan).

## Technical notes
- Tidak ada migration DB. Semua perubahan di layer UI + routing.
- File yang dihapus: `SPKTemplateBuilderPage.tsx`, `SPKAutomationViewer.tsx`, `SPKAnalyticsPage.tsx`.
- File yang diubah: `Admin.tsx`, `dashboardMenu.ts`, `SPKDomainDashboard.tsx`, `SPKReportsPage.tsx`, `SPKConfigurationPanel.tsx`.
- Runtime bootstraps (`main.tsx`, `AutomationBootstrap.ts`, `SchemaBuilder`) tidak disentuh.
