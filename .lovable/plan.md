## Tujuan

Membangun **System Management Center** sebagai pusat kontrol Owner untuk lifecycle aplikasi (versi, maintenance, release notes, sessions, cache), tanpa duplikasi terhadap modul "Versi Aplikasi" yang sudah ada — modul existing di-embed sebagai tab pertama.

---

## Arsitektur

### Routing baru
- `/dashboard/system-management` — hub utama (tab-based). Owner-only.
- `/dashboard/release-notes` — public-facing release notes (semua user login).
- `/dashboard/update-center` — feed perubahan untuk user.

### Redirect kompatibilitas
- `/dashboard/app-version` → tetap berfungsi (legacy), **dan** juga di-mount sebagai tab "Versi Aplikasi" di System Management. Tidak diduplikasi — `AppVersionManager` component di-reuse di kedua tempat.

### Menu sidebar (`src/config/dashboardMenu.ts`)
- Tambah `System Management` (icon `Settings2`, section `pusat_kontrol`, `requiredRole: "owner"`).
- Hapus entry "Versi Aplikasi" standalone dari sidebar (tetap tersedia via tab + redirect lama).
- Tambah `Release Notes` (section `pengaturan`, semua role internal).

---

## Halaman: `/dashboard/system-management`

Layout tab horizontal (komponen `Tabs` shadcn). Tab list:

1. **Versi Aplikasi** — embed `<AppVersionManager />` existing (tanpa modifikasi).
2. **Maintenance Mode** — toggle, estimasi selesai, alasan, whitelist role (Owner/Super Admin tetap masuk).
3. **Release Notes** — CRUD catatan rilis (auto-generated saat publish versi).
4. **Deployment History** — tabel riwayat publish (versi, tanggal, oleh, status, jumlah user updated/pending).
5. **System Audit** — auto-scan: broken pages, dead routes, version mismatch, cache conflict, failed notifications. Reuse `PageAuditPanel` sebagai sub-section.
6. **User Sessions** — daftar user online (dari `user_presence`): browser, OS, last activity, versi client. Aksi: Force Logout, Force Refresh, Force Clear Cache, Force Update.
7. **Cache Management** — status cache & service worker, tombol Clear All / Refresh All / Rebuild / Sync Version (broadcast event via Supabase Realtime).
8. **Update Center** — preview feed yang dilihat user di `/dashboard/update-center`.

---

## Database (migrasi baru, tidak ubah existing)

```sql
-- Riwayat deployment + release notes terstruktur
create table public.app_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  previous_version text,
  released_at timestamptz not null default now(),
  released_by uuid references auth.users(id),
  status text not null default 'published',  -- draft|published|rolled_back
  category text[] not null default '{}',     -- ['feature','bugfix','security',...]
  title text,
  summary text,
  purpose text,                              -- tujuan perubahan
  reason text,                               -- alasan perubahan
  impact text,                               -- dampak ke user
  affected_modules text[] default '{}',
  priority text default 'normal',            -- low|normal|high|critical
  force_update boolean default false,
  changes jsonb default '[]'::jsonb          -- array {category, description}
);

-- Tracking adopsi versi per client
create table public.app_version_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  current_version text,
  last_seen_at timestamptz default now(),
  user_agent text,
  browser text,
  os text,
  update_status text default 'updated',      -- updated|pending|failed
  unique(user_id)
);

-- Maintenance mode (single-row pattern via app_settings key)
-- Reuse public.app_settings dengan key='maintenance_mode'
-- value: { active, reason, estimated_end, allow_roles: ['owner','staff'] }
```

GRANT + RLS:
- `app_releases`: SELECT untuk `authenticated` (semua role lihat release notes); INSERT/UPDATE/DELETE Owner only via `has_role(auth.uid(),'staff')`.
- `app_version_clients`: SELECT/UPDATE own row + SELECT all untuk Owner; INSERT/UPDATE via RPC.
- Service role: ALL.

---

## Flow: Publish New Version

Tombol "🚀 Publish New Version" di tab Versi Aplikasi (extend `AppVersionManager`):
1. Naikkan `app_settings.app_version` (existing behaviour).
2. Insert row ke `app_releases` dengan field: version, released_by=auth.uid(), category, summary, purpose, reason, impact, affected_modules, priority, force_update, changes.
3. Trigger edge function baru `broadcast-app-update`:
   - Insert in-app notification ke semua user (`notifications` table).
   - Dispatch push via `dispatch-notification` existing.
   - Broadcast Supabase Realtime channel `app_version_watch` (sudah ada di `useAppVersion`).
4. Reset `app_version_clients.update_status='pending'` untuk semua user kecuali yang sudah pada versi baru.

Existing `VersionGate` + `useAppVersion` sudah handle: poll 60s, realtime, soft banner, blocking modal saat `force_refresh=true` atau di bawah `app_min_version`. Tambah:
- Saat user load versi baru, POST ke RPC `record_client_version` → update `app_version_clients`.
- Tambah popup "Aplikasi telah diperbarui" dengan ringkasan dari `app_releases` (sekali per versi, dismiss disimpan di localStorage).

---

## Maintenance Mode

Gate baru `<MaintenanceGate />` di `App.tsx` (dekat `VersionGate`):
- Subscribe ke `app_settings` key=`maintenance_mode`.
- Jika `active=true` dan user **bukan** Owner/Staff → render full-page maintenance dengan reason + estimasi selesai.
- Tidak mengubah route lain.

---

## User Sessions

Sumber: `user_presence` (existing) + join `app_version_clients` + `profiles`. Realtime subscribe. Aksi:
- **Force Logout**: edge function `admin-user-ops` (existing) — tambah action `force_logout` (invalidate refresh tokens via `auth.admin.signOut`).
- **Force Refresh / Clear Cache / Update**: broadcast Realtime event `client_command` dengan payload `{ target_user_id, action }`. Hook `useClientCommands` (baru) di-mount global, eksekusi `hardReload()` / clear caches.

---

## Cache Management

Reuse `hardReload()` dari `src/lib/appVersion.ts`. Tombol-tombol broadcast event lewat Realtime channel `client_commands` ke target=`*` (semua user).

---

## Halaman User-Facing: `/dashboard/update-center`

Read-only feed `app_releases` (status=published) urut DESC. Render kategori dengan emoji, kartu liquid-glass per release. Akses: semua user login (bukan Owner-only).

## Halaman: `/dashboard/release-notes`

Mirip update-center tapi versi admin: bisa edit/draft/publish release tanpa publish versi (untuk koreksi catatan).

---

## Laporan Tambahan (di tab Deployment History & System Audit)

- **System Update History**: query `app_releases` + agregat `app_version_clients` (total updated, pending).
- **Feature Adoption**: persentase user pada versi terbaru, device cache lama, gagal/berhasil update — render kartu KPI + table.

---

## File-File yang Akan Dibuat / Diubah

### Baru
- `src/pages/SystemManagement.tsx` (atau `src/components/admin/system/SystemManagementHub.tsx`) — tab container
- `src/components/admin/system/MaintenanceModePanel.tsx`
- `src/components/admin/system/ReleaseNotesManager.tsx`
- `src/components/admin/system/DeploymentHistoryPanel.tsx`
- `src/components/admin/system/UserSessionsPanel.tsx`
- `src/components/admin/system/CacheManagementPanel.tsx`
- `src/components/admin/system/SystemAuditPanel.tsx` (wrap existing `PageAuditPanel` + scan tambahan)
- `src/components/admin/system/FeatureAdoptionCard.tsx`
- `src/components/MaintenanceGate.tsx`
- `src/components/UpdatePopup.tsx` — popup "Aplikasi telah diperbarui"
- `src/pages/UpdateCenter.tsx`
- `src/hooks/useClientCommands.ts`
- `src/hooks/useReleaseNotes.ts`
- `supabase/functions/broadcast-app-update/index.ts`
- `supabase/functions/record-client-version/index.ts` (atau RPC)
- Migrasi: `app_releases`, `app_version_clients`, key `maintenance_mode` di `app_settings`

### Diubah
- `src/App.tsx` — mount `<MaintenanceGate />`, `<UpdatePopup />`, route `/dashboard/update-center`
- `src/pages/Admin.tsx` — route `system-management`, `release-notes`; tetap pertahankan `app-version` (tab di hub sekaligus redirect-friendly)
- `src/config/dashboardMenu.ts` — tambah `System Management` + `Release Notes`, hapus standalone `Versi Aplikasi` (atau tandai `hideInSidebar:true` agar redirect lama tetap hidup)
- `src/components/admin/AppVersionManager.tsx` — extend tombol publish: tulis ke `app_releases`, panggil edge function broadcast
- `src/hooks/useAppVersion.ts` — record client version on load

---

## Catatan Non-Duplikasi

- **Tidak** ada modul versi aplikasi baru — `AppVersionManager` di-reuse sebagai tab pertama.
- Route lama `/dashboard/app-version` tetap aktif (redirect ke tab versi di hub) sehingga link existing tidak rusak.
- Tabel `app_settings` existing untuk version tidak diubah; `app_releases` adalah tabel pelengkap (riwayat + metadata).

---

## Pertanyaan sebelum implementasi

Karena scope besar (8 tab + 2 halaman + 2 tabel + 2 edge function), saya usulkan implementasi **bertahap** agar bisa di-review per milestone:

**Fase 1 (foundation)**: Migrasi DB + Hub shell + tab Versi Aplikasi (reuse) + Release Notes auto-generate saat publish + Update Popup user-facing.

**Fase 2 (control)**: Maintenance Mode + User Sessions + Cache Management + force commands via Realtime.

**Fase 3 (visibility)**: Deployment History + Feature Adoption + System Audit (extend page audit) + `/dashboard/update-center`.

Konfirmasi: lanjut implementasi **seluruh fase sekaligus** atau **mulai dari Fase 1** lalu lanjut bertahap?
