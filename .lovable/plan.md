# Phase 4 — Smart Update Process

Hubungkan tombol "Update Sekarang" ke proses update nyata: sinkron Service Worker, bersihkan cache aplikasi lama, ambil aset versi terbaru, lalu reload — semua tanpa menyentuh session/routing/DB.

## Batasan (tidak diubah)
Login Google, Session/Access/Refresh Token, User Profile, Role/Permission/Branch, Theme, Preference, Routing, Database, Endpoint, dan file `public/sw.js` (dihasilkan oleh `vite-plugin-pwa`) serta `firebase-messaging-sw.js`.

## Perubahan File

### 1. `src/services/updateProcess.ts` (baru)
Orkestrator murni tanpa UI. Ekspor `runSmartUpdate(opts?: { onLog?: (evt) => void }): Promise<{ status: "success" | "no_update" | "failed"; error?: unknown; durationMs: number }>`.

Urutan langkah (setiap langkah menghasilkan log via `console.debug` + `onLog`):

1. `update_started` — catat `performance.now()`.
2. **Re-validate**: panggil `runVersionCheck()` lagi. Jika `!isUpdateAvailable`, kembalikan `no_update` (dialog tetap tertutup, tidak reload).
3. **Sync Service Worker** (skip di iOS Safari tanpa SW): `navigator.serviceWorker.getRegistration()`, `reg.update()`, tunggu event `updatefound` / `statechange=installed` (waiting) dengan timeout 6 dtk; bila ada waiting worker → `worker.postMessage({ type: "SKIP_WAITING" })`. Log `service_worker_updated`.
4. **Clean stale caches**: `caches.keys()` → hapus HANYA cache milik app-shell kita: nama yang cocok dengan salah satu dari `html-pages`, `static-assets`, `images`, `supabase-api`, atau prefix `workbox-precache-` / diakhiri scope. Whitelist ini persis dengan konfigurasi di `vite.config.ts`. **Tidak** menyentuh `localStorage`, `sessionStorage`, IndexedDB, atau cache Firebase Messaging (`firebase-*`, `fcm-*`). Log `cache_cleared` beserta jumlah cache yang dibersihkan.
5. **Fetch new assets**: `fetch("/index.html?ts=" + Date.now(), { cache: "reload", credentials: "same-origin" })` untuk memaksa HTML segar. Log `assets_downloaded`.
6. **Persist marker**: tulis `localStorage["app_last_updated"] = JSON.stringify({ version, build, at })` — dipakai untuk snackbar pasca-reload.
7. `version_updated` + `update_duration=Xms`.
8. **Reload**: `window.location.reload()`.

Setiap error → log `update_failed` + return `{ status: "failed", error, durationMs }`. Tidak melempar; caller menampilkan dialog error.

### 2. `src/components/update/UpdateProgressOverlay.tsx` (baru)
Overlay fullscreen (glass + backdrop-blur, red neon accent) yang tidak dapat ditutup:
- Ikon `ArrowUpCircle` beranimasi ringan
- Judul: **Memperbarui Aplikasi**
- Subjudul: **Sedang mengunduh versi terbaru...**
- Catatan: **Mohon jangan menutup aplikasi.**
- Indikator: `Loader2` berputar (indeterminate). Tidak ada progres palsu.

Props: `open: boolean`.

### 3. `src/components/update/UpdateErrorDialog.tsx` (baru)
`Dialog` shadcn:
- Judul: **Gagal memperbarui aplikasi.**
- Deskripsi singkat: "Tidak dapat menyelesaikan pembaruan. Sesi login Anda tetap aman."
- Tombol: **Coba Lagi** (primary) → `onRetry()`, **Tutup** (secondary) → `onClose()`.

### 4. `src/components/update/UpdateDialog.tsx` (edit)
- Tambah prop opsional `onUpdate?: () => void`.
- Handler "Update Sekarang":
  1. `recordUpdateChoice("update")`
  2. `markUpdateDialogShown()`
  3. `onOpenChange(false)`
  4. Jika `onUpdate` diberikan → panggil (host akan menjalankan `runSmartUpdate`). Perilaku "hanya log" dipertahankan bila prop tidak diberikan.

### 5. `src/components/update/UpdateDialogHost.tsx` (edit)
State tambahan: `phase: "idle" | "updating" | "error"`.
- `startUpdate()` → set `phase="updating"`, panggil `runSmartUpdate()`:
  - `success` → tidak melakukan apa-apa (browser akan reload dari service).
  - `no_update` → set `phase="idle"` (client sudah up-to-date).
  - `failed` → set `phase="error"`.
- Render tambahan:
  - `<UpdateProgressOverlay open={phase==="updating"} />`
  - `<UpdateErrorDialog open={phase==="error"} onRetry={startUpdate} onClose={()=>setPhase("idle")} />`
- Teruskan `onUpdate={startUpdate}` ke `<UpdateDialog>`.

### 6. `src/components/update/UpdateSuccessToast.tsx` (baru, kecil)
Efek satu kali saat mount:
- Baca `localStorage["app_last_updated"]`. Jika ada:
  - `toast.success("Aplikasi berhasil diperbarui", { duration: 3000 })` via sonner.
  - Hapus key.
- Mount di dalam `UpdateDialogHost` supaya hanya satu instance.

### 7. Validasi pasca-reload
Tidak butuh kode ekstra: setelah reload, `APP_BUILD_NUMBER` konstanta build sudah baru → `runVersionCheck()` on mount menghasilkan `isUpdateAvailable=false`; `updateDialogShown` default `false`; dialog tidak muncul lagi. Cukup pastikan marker `app_last_updated` dihapus setelah toast tampil.

## Session Preservation — Rules Baja
- Cache Storage: hapus hanya nama dari whitelist Workbox app-shell.
- Local/session storage & IndexedDB: **tidak disentuh sama sekali**, sehingga `sb-*-auth-token` (Supabase) tetap ada → user tetap login setelah reload.
- Service Worker Firebase Messaging (`firebase-messaging-sw.js`) tidak di-unregister.

## Logging (semua via `console.debug` + `onLog` opsional)
`update_started`, `revalidated`, `service_worker_updated`, `cache_cleared`, `assets_downloaded`, `version_updated`, `reload_completed` (dari toast pasca-reload), `update_failed`, `update_duration_ms`.

## Tidak Dibuat (Phase berikutnya)
Force update, countdown, auto update, maintenance mode, reminder, push notification, update center, deployment history, client monitoring.

## Verifikasi
- `tsgo` lulus.
- Simulasi: naikkan `build_number` `app_releases` (published) → dialog muncul → klik **Update Sekarang** → overlay tampil → reload → snackbar "Aplikasi berhasil diperbarui" muncul 3 dtk → user masih login (Supabase session utuh).
- Simulasi gagal (matikan jaringan setelah step 3) → dialog "Gagal memperbarui aplikasi." muncul, session tetap aktif, tombol **Coba Lagi** mengulangi flow.
