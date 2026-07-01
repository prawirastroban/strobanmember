## Phase 2 — Version Detection

Menambahkan mekanisme deteksi versi baru antara client dan server. **Tidak ada UI yang berubah**, tidak ada popup, tidak ada reload, tidak menyentuh SW / cache / routing / auth.

### 1. Context global baru — `src/contexts/VersionCheckContext.tsx`

Provider ringan yang menyimpan hasil pengecekan versi di React state. Dibaca oleh phase berikutnya lewat `useVersionCheck()`.

State yang disediakan:
```
isUpdateAvailable: boolean
localVersion:     string      // APP_VERSION (build-time)
serverVersion:    string | null
localBuild:       number      // APP_BUILD_NUMBER (build-time)
serverBuild:      number | null
lastVersionCheck: string | null   // ISO timestamp
updateCheckStatus: 'idle' | 'checking' | 'ok' | 'failed'
checkNow():       Promise<void>
```

Logika perbandingan (helper murni, tanpa side-effect):
- `isUpdateAvailable` = `compareVersion(local, server) < 0` **ATAU** `serverBuild > localBuild`.
- Jika server tidak mengembalikan `serverBuild`, hanya bandingkan versi.
- Fallback aman: kalau server null → `isUpdateAvailable = false`.

### 2. Service pengecekan — `src/services/versionCheck.ts` (baru)

Fungsi tunggal `runVersionCheck()` yang:
1. Panggil `getVersionRegistry()` dari service Phase 1 (tanpa perubahan pada file itu).
2. Bandingkan dengan `APP_VERSION` / `APP_BUILD_NUMBER`.
3. Kembalikan `VersionCheckResult` (localVersion, serverVersion, localBuild, serverBuild, isUpdateAvailable, checkedAt, status).
4. Tidak melempar error — semua kegagalan dipetakan ke `status: 'failed'`.

Logging debug (hanya `console.debug`, tidak ke UI):
```
[VersionCheck] local=v1.2.3 (#123) server=v1.2.4 (#124) updateAvailable=true at=2026-...
```

### 3. Kapan pengecekan berjalan

Di dalam `VersionCheckProvider` `useEffect`:
- **On mount** (aplikasi dibuka).
- **On resume dari background**: listener `document.visibilitychange` → jalankan saat kembali `visible`. Untuk native (Capacitor), tambahkan `App.addListener('appStateChange', ...)` bila `Capacitor.isNativePlatform()` — dibungkus dynamic import supaya tidak mengganggu web build.
- **Tanpa polling berkala.** Tidak ada `setInterval`.

Concurrency guard: kalau `updateCheckStatus === 'checking'`, request kedua di-skip.

### 4. Integrasi

- Mount `<VersionCheckProvider />` di `src/App.tsx`, membungkus konten aplikasi di luar provider yang sensitif (di dalam existing providers, sebelum router). Tidak render UI apa pun.
- Tidak mengubah `useAppVersion`, `VersionGate`, `updateChecker`, `registerSW`, atau file SW.
- Tidak mengubah `AppVersionManager.tsx`.

### 5. Error handling

Bila `getVersionRegistry()` throw / return fallback dev:
- `updateCheckStatus = 'failed'`
- `isUpdateAvailable = false`
- Tidak menampilkan toast, tidak logout, tidak menghentikan render.
- Aplikasi tetap berjalan normal.

### 6. Yang TIDAK dibuat di phase ini

Popup update, countdown, auto refresh, force update, cache refresh, SW update, release notes popup, notifikasi, deployment history. Context di atas hanya menyediakan **state**; konsumen (Phase 3+) yang akan menambahkan UI/aksi.

### Detail teknis

- File baru: `src/contexts/VersionCheckContext.tsx`, `src/services/versionCheck.ts`.
- Perubahan file existing: hanya `src/App.tsx` (menyisipkan provider). Tidak ada perubahan skema DB, tidak ada migrasi.
- Native resume listener menggunakan `@capacitor/app` yang sudah tersedia di project.
