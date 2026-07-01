# Phase 3 — Update Dialog

Menampilkan dialog informasi update satu kali per sesi ketika `isUpdateAvailable = true`. Tidak melakukan refresh, clear cache, force update, atau perubahan routing/session.

## Scope
- Menambah **UI dialog + session flag**. Tidak menyentuh: Login/Google, Session, Routing, Dashboard, Service Worker, Cache, Deployment, Maintenance Mode.
- Tidak membuat: Force Update, Auto Refresh, Clear Cache, Auto Install, Logout, Reload, Countdown, Push, Background Sync, SW Update.

## Perubahan File

### 1. `src/services/versionRegistry.ts` (small extension)
- Tambahkan field `releaseNotes: string | null` di `VersionRegistryInfo`.
- Baca kolom `release_notes` yang sudah ada di `app_releases` dan lewati apa adanya (string). Fallback → `null`.
- Tidak mengubah signature `useVersionRegistry` / `getVersionRegistry`.

### 2. `src/services/versionCheck.ts` (small extension)
- Sertakan `releaseNotes`, `releaseDate`, `releaseChannel` di `VersionCheckResult` (diteruskan dari registry). Tidak mengubah logic `computeUpdateAvailable`.

### 3. `src/contexts/VersionCheckContext.tsx` (extend)
- Tambah state di context:
  - `releaseNotes: string | null`
  - `releaseDate: string | null`
  - `releaseChannel: ReleaseChannel | null`
  - `updateDialogShown: boolean`
  - `markUpdateDialogShown(): void`
  - `recordUpdateChoice(choice: "update" | "later"): void` (logging only, tidak melakukan aksi lain)
- `updateDialogShown` disimpan **di memori (useState)** saja → otomatis reset ketika app dibuka ulang (sesuai requirement "muncul kembali saat aplikasi dibuka ulang").
- Existing check-on-mount / on-resume tetap. Saat `checkNow()` menemukan versi baru dan `updateDialogShown` masih `false`, dialog akan diizinkan tampil oleh konsumen.

### 4. `src/components/update/UpdateDialog.tsx` (new)
- Menggunakan `Dialog` shadcn (sudah ada) — modal terpusat, tidak fullscreen, overlay di atas semua halaman, tidak mengubah route aktif.
- Konten:
  - Ikon `ArrowUpCircle` (lucide) dengan aksen brand `#ff2b2b`.
  - Judul: **"Aplikasi telah diperbarui"**.
  - Subjudul: **"Versi terbaru telah tersedia."**
  - Grid info 2 kolom: Current Version, Latest Version, Current Build, Latest Build, Release Date (via `formatReleaseDate`), Release Channel.
  - Section "Perubahan": parse `releaseNotes` menjadi list dengan aturan:
    - Split by newline.
    - Buang bullet awalan (`-`, `*`, `•`).
    - Ambil maks **5 baris pertama** yang non-kosong.
    - Jika kosong / null → tampilkan satu baris: **"Perbaikan performa dan peningkatan stabilitas."**
  - Tombol:
    - Primary "Update Sekarang" → panggil `recordUpdateChoice("update")`, `markUpdateDialogShown()`, `onOpenChange(false)`. **Belum melakukan update apa pun** (hook siap untuk Phase 4).
    - Secondary "Nanti" → panggil `recordUpdateChoice("later")`, `markUpdateDialogShown()`, `onOpenChange(false)`.
- Styling: konsisten dengan design system (liquid glass / red neon accent, radius shadcn).

### 5. `src/components/update/UpdateDialogHost.tsx` (new)
- Komponen tak-berwujud yang memutuskan kapan dialog muncul:
  - Ambil `useVersionCheck()`.
  - Kondisi buka: `isUpdateAvailable && !updateDialogShown && updateCheckStatus === "ok"`.
  - Saat pertama kali kondisi tsb `true`, log `[UpdateDialog] displayed` (versi, build, timestamp) lalu `markUpdateDialogShown()` dipanggil oleh dialog saat ditutup (bukan saat dibuka) — mencegah loop.
  - Untuk mencegah dialog mengintip berulang selama app aktif: state lokal `hasOpened` + `updateDialogShown` di context.

### 6. `src/App.tsx` (mount host)
- Render `<UpdateDialogHost />` **di dalam** `VersionCheckProvider`, sekali (di root layout), sehingga tampil di atas semua route tanpa mengubah halaman yang sedang dibuka.

## Logging
Semua via `console.debug` (tidak ke UI):
- `[UpdateDialog] displayed vLOCAL(#B) → vSERVER(#B) at TS`
- `[UpdateDialog] user_choice=update vLOCAL(#B) → vSERVER(#B) at TS`
- `[UpdateDialog] user_choice=later …`

## Perilaku Sesuai Requirement
- `isUpdateAvailable = true` → dialog muncul **satu kali** per sesi.
- Tombol "Update Sekarang" & "Nanti" hanya menutup dialog + logging.
- Dialog **tidak** muncul lagi saat berpindah halaman (state di React context bertahan selama app aktif).
- Saat app dibuka ulang, `updateDialogShown` kembali `false` → dialog muncul lagi jika masih ada update.
- Tidak ada modifikasi Service Worker, cache, routing, atau session.

## Verifikasi
- Build lulus (`tsgo`).
- Smoke manual: naikkan `build_number` di `app_releases` (published) di atas `APP_BUILD_NUMBER` → dialog muncul; klik Nanti → tidak muncul lagi hingga reload. Klik Update Sekarang → menutup dialog, tidak reload, tidak clear cache.
