## Phase 7 — System Management Center

Membangun halaman dashboard baru `/dashboard/system-management` sebagai pusat kontrol lifecycle aplikasi untuk **Owner** dan **Super Admin**. Modul existing (Versi Aplikasi, Maintenance Center, Release Notes, Update Center, Audit, Cache, Sessions, Deployment History) **tidak diubah** — dashboard ini hanya menampilkan status ringkas + tombol navigasi ke modul-modul tersebut.

## Perubahan Routing

- `src/pages/Admin.tsx`: hapus redirect `system-management → maintenance`. Ganti dengan route baru yang me-render `SystemManagementCenter` di dalam `<OwnerOnly>` + `AdminLayout`.
- `src/config/dashboardMenu.ts`: tambahkan menu **⚙️ System Management** (Owner + Super Admin) di section `pengaturan`, di atas "Versi Aplikasi" & "Maintenance Center". Item existing tetap ada — tidak dihapus/di-rename.
- Guard akses: `OwnerOnly` (staff = Owner) + `admin` (Super Admin/CS). Selain itu redirect ke `/dashboard`.

## File Baru

Semua di bawah `src/components/admin/system-center/`:

1. **`SystemManagementCenter.tsx`** — root page, mengatur grid layout responsive (`grid gap-4 md:grid-cols-2 xl:grid-cols-3`) dengan skeleton/error/empty state.
2. **`ApplicationStatusCard.tsx`** — Current Version, Previous Version, Release Date, Deployment Type, Deployment Status, Min Supported Version. Data via `versionRegistry.ts` (sudah ada) + `app_releases` (`is_current`, `previous_version`, `min_supported_version`).
3. **`ClientStatusCard.tsx`** — Total Active Users, Online Users, Updated / Pending / Failed, Adoption %. Data dari `app_version_clients` (count by version vs current). Adoption ditampilkan sebagai `<Progress>` bar.
4. **`ServerStatusCard.tsx`** — API / Database / Storage / Realtime / Notification indicator (🟢/🟡/🔴). Ping ringan: `supabase.from('app_settings').select('key').limit(1)` (DB+API), `supabase.storage.listBuckets()` (Storage), realtime channel subscribe status (Realtime), cek `push_tokens` reachability (Notification).
5. **`QuickActionsGrid.tsx`** — 8 tombol grid card yang navigate ke route existing:
   - Publish Version → `/dashboard/maintenance?tab=version`
   - Maintenance Mode → `/dashboard/maintenance?tab=maintenance` (fallback jika belum ada tab, tetap ke maintenance)
   - Release Notes → `/dashboard/maintenance?tab=release-notes`
   - Update Center → `/dashboard/update-center` (existing page)
   - Deployment History → `/dashboard/maintenance?tab=history`
   - User Sessions → `/dashboard/maintenance?tab=sessions`
   - Cache Management → `/dashboard/maintenance?tab=cache`
   - System Audit → `/dashboard/maintenance?tab=audit`
6. **`RecentActivityTimeline.tsx`** — 10 event terbaru dari `activity_logs` + `admin_audit_log` (filter aksi: publish, release_notes, cache, maintenance, deployment) — urut terbaru, tampilkan jam + label.
7. **`DeploymentSummaryCard.tsx`** — Tabs Hari Ini / Minggu Ini / Bulan Ini. Query `app_releases` group by `release_channel` + `deployment_status`, tampilkan Total Deployment, Total Release, Success, Failed.
8. **`VersionDistributionCard.tsx`** — Distribusi user per versi dari `app_version_clients` (group by `app_version`). Progress bar per versi (top 3 + "Older").
9. **`SystemInformationCard.tsx`** — Application Name, Current Build, Current Version, Capacitor Version (`@capacitor/core` dari `package.json` via import atau constant), PWA Version (`src/config/version.ts`), Environment (`detectEnvironment`), Last Deployment, Developer.
10. **`SecurityInformationCard.tsx`** — HTTPS (`location.protocol`), Authentication (session valid?), Realtime (channel state), Session (token expiry), App Links (`assetlinks.json` fetch), Push Notification (permission + token ada).

## File Baru — Data Layer

- **`src/services/systemCenter.ts`** — kumpulan fetcher: `fetchApplicationStatus()`, `fetchClientStatus()`, `fetchServerStatus()`, `fetchDeploymentSummary(range)`, `fetchVersionDistribution()`, `fetchRecentSystemActivity()`. Semua read-only, memakai `supabase` client + `versionRegistry`.
- **`src/hooks/useSystemCenter.ts`** — react hook yang membungkus service dengan polling 30 detik + realtime subscription ke `app_releases` & `app_version_clients` untuk auto-refresh.

## UI / UX

- Style konsisten Apple-liquid-glass: `border-white/10 bg-card/60 backdrop-blur-xl`, rounded-2xl, soft shadow, red-neon aksen `#ff2b2b` untuk indikator penting.
- Loading: skeleton per card (`<Skeleton>` shadcn) — tidak blocking global.
- Empty state: card tetap render dengan placeholder "Belum ada data".
- Error state: badge merah + tombol "Coba lagi".
- Responsive: 1 kolom mobile, 2 kolom md, 3 kolom xl.
- Dark mode: pakai token semantic (`text-foreground`, `bg-card`) — tidak hardcode warna.

## Yang TIDAK Dilakukan

- Tidak ada perubahan schema DB, tidak ada migration.
- Tidak menyentuh `AppVersionManager.tsx`, `MaintenanceCenterHub.tsx`, `SystemManagementHub.tsx`, `UpdateDialogHost.tsx`, `versionCheck.ts`, `versionRealtime.ts`.
- Tidak mengimplementasi Maintenance Mode toggle, Rollback, Cache purge, Session revoke, dsb. — Quick Actions hanya navigasi ke modul yang sudah ada. Implementasi detail = Phase berikutnya.
- Tidak membuat menu / route "Versi Aplikasi" baru — tetap `/dashboard/maintenance` (tab version).

## Verifikasi

- Cek route render di `/dashboard/system-management` (Owner login), redirect untuk role lain.
- Cek semua Quick Action navigate ke tab modul existing tanpa error.
- Cek polling + realtime refresh saat `app_releases` di-update dari tab Versi Aplikasi.
- Cek indikator server status di kondisi online (baseline hijau).
