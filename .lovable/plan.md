## Application Version Control & Force Refresh

Memastikan semua user otomatis mendapat versi frontend terbaru setelah deploy, tanpa clear cache manual, tanpa mismatch frontend ↔ backend.

### Arsitektur

```
build time          runtime (client)             server (DB)
-----------         ----------------             -----------
VITE_APP_VERSION    window.__APP_VERSION__   <-> app_settings.app_version (singleton)
   |                       |                            ^
   v                       v                            |
index.html           VersionGate poll  ------ realtime/poll ------
```

- **Build-time version**: `VITE_APP_VERSION` di-inject saat build (otomatis dari timestamp build + commit short). Disimpan di `window.__APP_VERSION__`.
- **Server version**: row `app_settings` key `app_version` (sumber tunggal kebenaran).
- **Saat deploy**: developer/owner update versi di `/dashboard/settings → App Version` (atau auto-bump). Server menyimpan: `version`, `released_at`, `force_refresh` (bool), `min_supported_version`, `release_notes`.

### Komponen yang dibuat

1. **Migration** – tambahkan baris ke `app_settings`:
   - `app_version` (current latest, mis. `1.0.0`)
   - `app_min_version` (frontend lebih lama dari ini = wajib refresh keras)
   - `app_release_notes`, `app_released_at`, `app_force_refresh`

2. **`src/lib/appVersion.ts`** – konstanta `APP_VERSION` dari `import.meta.env.VITE_APP_VERSION`, helper `compareSemver`.

3. **`vite.config.ts`** – `define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(buildVersion) }` (timestamp `YYYYMMDDHHmm` + short hash fallback).

4. **`src/hooks/useAppVersion.ts`** – ambil server version (realtime subscribe + polling tiap 60 detik + saat tab kembali focus/online). Return `{ current, latest, mismatch, forceRefresh, minVersionViolated }`.

5. **`src/components/VersionGate.tsx`** (mount di `App.tsx`):
   - **Soft update banner** (mismatch & belum melewati min): toast non-blocking "Versi baru tersedia – Muat Ulang", tombol kuning glass, auto-dismiss option.
   - **Hard refresh modal** (force_refresh = true atau current < min_version): full-screen liquid-glass modal, tidak bisa ditutup, tombol "Perbarui Sekarang" → menjalankan `hardReload()`:
     1. `caches.keys()` → hapus semua cache (kecuali Firebase Messaging buckets, mengikuti aturan PWA yang sudah ada).
     2. Unregister SW `/sw.js` saja (jangan sentuh `firebase-messaging-sw.js`).
     3. `localStorage.removeItem('lastVisitedPath')` (opsional), tidak hapus sesi auth.
     4. `location.replace(location.pathname + '?v=' + latest)` untuk bust HTTP cache.

6. **Admin UI – `/dashboard/settings/app-version`** (panel baru di Settings):
   - Field: current version (read-only build), latest version (editable), min supported version, release notes, toggle Force Refresh.
   - Tombol "Bump Patch / Minor / Major" + "Publish".
   - Indikator: berapa client aktif masih di versi lama (pakai `user_presence` + opsional kolom `app_version` di presence – dilewati di v1 untuk menjaga scope).
   - Edit dibatasi role `owner`/`admin` via RLS yang sudah ada di `app_settings`.

7. **Footer/About** – tampilkan `APP_VERSION` kecil di Profile/Settings untuk debugging user.

### Perilaku

| Kondisi                                                    | Aksi UI                          |
| ---------------------------------------------------------- | -------------------------------- |
| `current === latest`                                       | tidak ada banner                 |
| `current < latest`, `force_refresh=false`, `>= min`        | Soft banner (dismissable)        |
| `current < latest`, `force_refresh=true`                   | Hard modal (blocking)            |
| `current < min_supported_version`                          | Hard modal (blocking)            |
| Offline / fetch error                                      | Diam, retry next interval        |

Polling: 60 dtk + on `visibilitychange` (visible) + on `online`. Realtime subscribe `app_settings` mempercepat broadcast saat owner publish.

### File yang akan diubah/dibuat

- `supabase/migrations/<ts>_app_version_control.sql` – seed key `app_version`, `app_min_version`, dll. (tanpa CREATE TABLE baru karena `app_settings` sudah ada).
- `vite.config.ts` – inject `VITE_APP_VERSION`.
- `src/lib/appVersion.ts` (baru), `src/hooks/useAppVersion.ts` (baru), `src/components/VersionGate.tsx` (baru).
- `src/App.tsx` – mount `<VersionGate />`.
- `src/components/admin/AppVersionManager.tsx` (baru) + entry di `src/config/dashboardMenu.ts` & route di `src/pages/Admin.tsx`.
- `src/pages/Profile.tsx` (atau Settings) – tampilkan versi.

### Tidak diubah

- Tidak menyentuh `firebase-messaging-sw.js`, push notifications, auth session, atau registrasi SW yang sudah ada (cuma menambah cleanup target `/sw.js` saat hard reload).
- Tidak menambah tabel baru (reuse `app_settings`).
- Tidak mengubah edge function existing.
