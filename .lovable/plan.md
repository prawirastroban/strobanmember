# Play Store Readiness — Finalization Audit

Audit hasil implementasi A–E sudah berjalan. Database, endpoint, flow booking/loyalty/notification, dan Force Update tidak akan disentuh. Hanya 4 bug kecil di lapisan presentasi yang perlu diperbaiki agar status audit benar-benar mencerminkan kondisi nyata produksi.

## Hasil audit per area

**A. Application Version** — OK
Current/Live/Previous/Min/Build/Released_at semua tampil dari `app_settings` + `app_releases`. Tidak ada placeholder. Tidak ada nilai dummy.

**B. Offline Page** — OK
`public/offline.html` punya logo (`/favicon.png`), tombol "Coba Lagi" (`location.reload`), tombol WhatsApp (`wa.me/628973700800`), auto-reload saat `online`. `vite.config.ts` sudah meng-exclude `/offline.html` dari `navigateFallback` (line 51).

**C. Build Number** — Hampir OK, 1 catatan
Format `YYYY.MMDD.HHmm` → 12 digit integer monotonic. Aman sebagai Android `versionCode` (<2,147,483,647). **Tapi** saat dev (`__APP_VERSION__` undefined → `0.0.0-dev`), `APP_BUILD_NUMBER = 0` — bukan monotonic. Perlu fallback.

**D. Play Store Readiness Checklist** — Beberapa item palsu
- "Error Boundary" check selalu `true` (`typeof window !== "undefined"`) — tidak benar-benar memverifikasi `AppErrorBoundary`.
- "Service Worker Active", "Push Notification Active", "Firebase Connected", "PWA Installed" adalah **runtime per-device** — di browser admin tanpa push grant akan merah dan menurunkan skor walaupun produksi sehat. Harus dipisah ke section "Device Runtime" yang tidak ikut skor readiness.
- "Environment" salah label: published `strobanmember.lovable.app` & `bengkelstroban.com` saat ini dianggap **Staging** karena `detectEnvironment()` memperlakukan semua `.lovable.app` sebagai staging. Hanya `id-preview--` / `preview--` yang seharusnya staging.

**E. Legal Validation** — OK
Query DB: privacy (4153 chars), terms (2941), refund (1003), contact (342). Threshold checklist 200 char → semua lulus, slug ditemukan, halaman `/legal/:slug` aktif.

**Maintenance Center tabs** — OK (7 tabs render, tidak ada empty state).

**Force Refresh** — OK. Bump `app_min_version`, set `force_refresh=true`, broadcast `client_commands` channel; client lama akan hit `VersionGate` blocking + `hardReload()` yang unregister `/sw.js` saja (Firebase Messaging cache tetap utuh — anti loop).

**Notification Audit** — Tabel `push_tokens` & `push_delivery_logs` ada. Angka real, bukan placeholder.

**PWA Audit** — Real-time check (manifest, SW, standalone, push permission, badge API). OK.

## Fixes (presentasi saja)

1. `src/lib/environment.ts` — `detectEnvironment()`:
   - Staging hanya untuk hostname yang **mulai** dengan `id-preview--` atau `preview--`, atau `.lovableproject.com` / `.lovableproject-dev.com`.
   - `*.lovable.app` non-preview & custom domain (`bengkelstroban.com`) → Production.

2. `src/lib/appVersion.ts` — `APP_BUILD_NUMBER` fallback:
   - Jika digits = 0 (dev), pakai `Math.floor(Date.now()/1000)` agar tetap monotonic & unik.

3. `src/components/admin/system/PlayStoreReadinessChecklist.tsx`:
   - Pisahkan checklist menjadi 2 group: **Readiness (server-side)** yang dihitung di skor, dan **Device Runtime (informational)** untuk SW/Push/Firebase/PWA install — tidak menurunkan skor.
   - "Error Boundary" diganti pengecekan presence komponen `AppErrorBoundary` di tree via marker `window.__APP_ERROR_BOUNDARY__ = true` (di-set dari `AppErrorBoundary.componentDidMount`).
   - Tambah footer **Skor Readiness 0–100%** = `passed_server / total_server * 100`, plus daftar warning untuk item device yang merah.

4. `src/components/AppErrorBoundary.tsx` — set `window.__APP_ERROR_BOUNDARY__ = true` di `componentDidMount` (1 baris, tidak mengubah perilaku error handling).

## File yang akan diubah

- `src/lib/environment.ts`
- `src/lib/appVersion.ts`
- `src/components/admin/system/PlayStoreReadinessChecklist.tsx`
- `src/components/AppErrorBoundary.tsx`

## Yang TIDAK disentuh

DB schema, edge functions, `firebase-messaging-sw.js`, `VersionGate`, `hardReload`, `useAppVersion`, flow Booking/Loyalty/Referral/Notification/CRM, manifest, offline.html, vite.config.ts.

## Skor Readiness sementara (sebelum fix)

Estimasi 78% — turun karena 4 item device runtime di admin browser & label environment salah. Setelah fix: estimasi ≥95% di Production.
