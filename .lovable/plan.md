## Fase 4: PWA Settings di Dashboard

Tambahkan panel admin untuk mengontrol perilaku banner install PWA + tracking sederhana, tanpa perlu deploy ulang setiap mau ubah copy/timing.

## Backend (1 migration)

**Tabel baru `public.pwa_settings`** (singleton row `id = 1`):
- `id` int PK
- `banner_enabled` bool default `true`
- `banner_title` text default `'Install Sahabat Stroban'`
- `banner_subtitle` text default `'Akses lebih cepat & notifikasi langsung'`
- `delay_seconds` int default `5`
- `reprompt_days` int default `0` (`0` = sekali seumur browser; `>0` = tampil ulang setelah N hari dismiss)
- `updated_at` timestamptz default `now()`
- Seed 1 row default.

**GRANTs**: `SELECT` ke `anon` + `authenticated` (perlu dibaca semua pengunjung), `ALL` ke `service_role`.
**RLS**: enable; policy `SELECT` ke `public`; `UPDATE` hanya untuk `has_role(auth.uid(), 'admin')` (Owner).

**Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.pwa_settings`.

**Tabel `pwa_events`** (log ringan untuk stat):
- `id` uuid PK default `gen_random_uuid()`
- `event` text — `'shown' | 'accepted' | 'dismissed'`
- `platform` text — `'android' | 'ios' | 'desktop'`
- `user_id` uuid nullable
- `created_at` timestamptz default `now()`
- Index: `(event, created_at)`.
- GRANT `INSERT` ke `anon` + `authenticated`; `SELECT` hanya `authenticated` (admin baca lewat policy).
- RLS: `INSERT` public; `SELECT` hanya admin (`has_role`).

## Frontend

**Hook baru `src/hooks/usePwaSettings.ts`**
- Fetch `pwa_settings` row 1, subscribe realtime.
- Return `{ settings, loading }` + default fallback agar banner tetap jalan jika fetch gagal.

**`src/components/InstallAppBanner.tsx` (refactor):**
- Konsumsi `usePwaSettings`.
- Skip render jika `banner_enabled === false`.
- Pakai `delay_seconds` dari config (bukan hardcoded 5000).
- Pakai `banner_title` & `banner_subtitle` dari config (override default).
- Ganti localStorage key `pwa_install_banner_shown` → simpan timestamp `pwa_install_banner_dismissed_at`.
  - Jika `reprompt_days = 0` → sekali selamanya (hide jika timestamp ada).
  - Jika `reprompt_days > 0` → hide hanya jika `now - timestamp < reprompt_days * 24h`.
- Log event ke `pwa_events` (best-effort, `void` await): `shown` saat muncul, `accepted` saat install diterima, `dismissed` saat ditolak/X.
- Deteksi `platform`: `isIOS` → `'ios'`, `isAndroid` → `'android'`, else `'desktop'`.

**Halaman baru `src/components/admin/PwaSettingsManager.tsx`**
- Form (`react-hook-form` opsional, cukup useState):
  - Switch: Aktifkan banner install
  - Input text: Judul banner
  - Textarea: Subtitle banner
  - Number: Delay (detik), min 0 max 60
  - Number: Re-prompt (hari), min 0 max 90 (0 = sekali selamanya)
  - Tombol Simpan → `supabase.from('pwa_settings').update(...).eq('id', 1)`
- Card statistik 30 hari terakhir (query `pwa_events`):
  - Total Shown, Total Accepted, Total Dismissed
  - Conversion rate = accepted / shown
  - Breakdown per platform (android/ios/desktop)
- Tombol "Reset preview di browser ini" → `localStorage.removeItem('pwa_install_banner_dismissed_at')` (untuk testing).

**`src/pages/Admin.tsx`**:
- Route baru `pwa-settings` di-wrap `<OwnerOnly>`:
  ```
  <Route path="pwa-settings" element={<OwnerOnly><AdminLayout title="PWA & Install Banner" description="Kelola banner install aplikasi dan statistiknya"><PwaSettingsManager /></AdminLayout></OwnerOnly>} />
  ```

**`src/components/admin/AdminSidebar.tsx`**:
- Item menu baru sebelum "Bug & Masukan":
  ```
  { title: "PWA & Install", url: "/dashboard/pwa-settings", icon: Download, requiredRole: "owner" }
  ```
- Import `Download` dari lucide-react.

## Tidak diubah
- Service worker (`vite.config.ts`, `src/pwa/registerSW.ts`), manifest, tombol install di Navbar/MobileNav/Sidebar.
- Backend booking/payment/auth.
- Hook `useInstallPrompt` (tetap pure event listener).

## Default behavior tetap aman
Jika tabel/policy gagal di-load, banner tetap muncul dengan default lama (enabled, 5 detik, copy default, sekali selamanya).
