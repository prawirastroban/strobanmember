# Phase 6 — Enterprise Force Update

Menambahkan tiga level deployment (Optional / Recommended / Force), countdown auto-refresh, guard sesi, header versi pada setiap request, penegakan `app_min_version`, serta retry & failure UI. Tidak mengubah login, session, routing, atau data existing.

## 1. Skema — kolom `deployment_type`

Migration idempotent pada `app_releases`:
```sql
ALTER TABLE public.app_releases
  ADD COLUMN IF NOT EXISTS deployment_type text
    NOT NULL DEFAULT 'optional'
    CHECK (deployment_type IN ('optional','recommended','force'));
-- Back-fill lama: yang force_update=true → 'force', selain itu 'optional'.
UPDATE public.app_releases
   SET deployment_type = CASE WHEN force_update THEN 'force' ELSE 'optional' END
 WHERE deployment_type = 'optional';
```
`force_update` boolean tetap dipertahankan untuk backward compat (di-sync saat publish). Tidak menyentuh RLS/grant.

## 2. Publish UI — pilihan Deployment Type

`src/components/admin/AppVersionManager.tsx`
- Ganti toggle "Force refresh" menjadi `<RadioGroup>` **Deployment Type**: `Optional | Recommended | Force`.
- Saat publish, tulis:
  - `app_releases.deployment_type` = pilihan
  - `app_releases.force_update` = `type === "force"` (sinkron backward compat)
  - `app_settings.app_min_version` diset ke versi baru **hanya bila** Force.

## 3. Service Layer

`src/services/versionRealtime.ts`
- Payload `AppVersionEvent` tambah `deploymentType: "optional"|"recommended"|"force"` (baca dari kolom baru; fallback dari `force_update`).

`src/services/versionRegistry.ts`
- Ekspor `deploymentType` dan `minSupportedVersion` (dari `app_settings.app_min_version`).

`src/services/versionCheck.ts`
- Hitung tambahan: `isBelowMinimum` (localBuild/version < min). Tetap tanpa side-effect.

`src/services/updateProcess.ts` (Phase 4) tetap dipakai; ditambah retry:
- Ekspor `runSmartUpdateWithRetry({ retries: 3, backoffMs: [1500, 3000, 6000] })` yang membungkus `runSmartUpdate`.
- Ekspor helper `hasPendingWork()` yang cek: form dirty (registrasi via `window.__stroban_pending`), upload berjalan, `navigator.serviceWorker.controller` + in-flight fetch counter (interceptor di §5).

## 4. Context — perluasan `VersionCheckContext`

Field baru (tanpa merusak konsumen existing):
- `deploymentType`, `minSupportedVersion`, `isBelowMinimum`
- `countdownActive`, `countdownRemaining`
- `updatePhase: "idle"|"pending"|"running"|"success"|"failed"`
- `retryCount`, `lastUpdateError`
- Setter: `startForcedUpdate()`, `cancelCountdown()` (hanya jika bukan Force)

Logika saat event realtime / initial check:
- Simpan `deploymentType`. Bila `deploymentType==="force"` **atau** `isBelowMinimum===true` → trigger ForceUpdateDialog.
- App resume dari background: bandingkan; bila Force → langsung ke ForceUpdateDialog.

## 5. Header Versi & Interceptor 426

`src/lib/httpVersionHeaders.ts` (baru):
- Global `fetch` override sekali di `main.tsx`. Untuk request same-origin dan ke Supabase Edge Functions URL, inject header `X-App-Version`, `X-App-Build`, `X-Client-Platform`.
- Simpan counter in-flight untuk `hasPendingWork()`.
- Response 426 → `window.dispatchEvent(new CustomEvent("stroban:force-upgrade-required", { detail }))`. Context mendengar → set `deploymentType="force"` & buka ForceUpdateDialog.

`supabase/functions/_shared/versionGate.ts` (baru):
- Helper `checkClientVersion(req, { min })` → `Response(null,{status:426})` bila kurang dari min. Diterapkan sebagai opt-in ke edge functions kritikal (booking-create, payment-create, admin-user-ops) tanpa refactor massal. Sisanya akan menyusul di Phase 7. (Tersirat dalam plan; user boleh minta scope lebih luas.)

## 6. UI Update Flow per tipe

`src/components/update/UpdateAvailableToast.tsx` (Phase 5) — hanya muncul saat **Optional**. Skip untuk recommended/force.

`src/components/update/UpdateDialog.tsx` — dipakai untuk **Recommended**. Tombol:
- **Update Sekarang** → `runSmartUpdateWithRetry()` (via pending-work gate)
- **Nanti** → tutup; re-open interval 30 menit (timer di context, hanya untuk Recommended).

`src/components/update/ForceUpdateDialog.tsx` (baru) — untuk **Force** & `isBelowMinimum`:
- Full-screen, `open` selalu true, `onOpenChange` no-op.
- Cegah Escape / outside-click / swipe: `onEscapeKeyDown={e=>e.preventDefault()}`, `onPointerDownOutside={e=>e.preventDefault()}`, `onInteractOutside`.
- Cegah back button: `history.pushState` guard + `Capacitor App.addListener("backButton")` no-op selama countdown.
- Countdown 10→0 detik, lalu jalankan pending-work gate → `runSmartUpdateWithRetry()`.
- Header: "Pembaruan wajib" · versi target · ringkasan.

`src/components/update/PendingWorkPrompt.tsx` (baru):
- Muncul sebelum reload jika `hasPendingWork()`. Pilihan:
  - **Simpan & Update** → dispatch `stroban:save-pending` (form listener menyimpan), tunggu resolve max 5 detik, lalu update.
  - **Update Sekarang** → langsung update.
  - **Batalkan** → hanya untuk Optional/Recommended.
- Untuk Force: jika user diam >30 detik atau pilih Batalkan, update tetap berjalan.

`src/components/update/UpdateFailureDialog.tsx` — reuse `UpdateErrorDialog` existing; ditambah tombol **Hubungi Administrator** (WhatsApp support link) yang muncul setelah 3 retry.

`UpdateDialogHost.tsx` diperluas:
- Pilih dialog berdasarkan `deploymentType`:
  - `optional` → hanya snackbar
  - `recommended` → `UpdateDialog`
  - `force` / `isBelowMinimum` → `ForceUpdateDialog`
- Sisipkan `PendingWorkPrompt` sebelum menjalankan update.

## 7. Version Enforcement — Route Gate

`src/components/update/VersionEnforcementGate.tsx` (baru), dipasang di root sebelum `<Routes>`:
- Bila `isBelowMinimum || deploymentType==='force'` selama update belum sukses:
  - Blokir rendering child untuk path privat (`/dashboard`, `/booking`, `/crm`, `/inventory`, `/report`, `/pos`, `/settings`, `/checkout`) — tampilkan hanya ForceUpdateDialog.
  - Halaman publik (`/`, `/auth/*`, `/legal/*`) tetap dapat diakses agar user tidak stuck total; ForceUpdateDialog tetap terlihat di atasnya.

## 8. Cache Strategy Aman

Alur di `runSmartUpdate` sudah:
1. `syncServiceWorker` (register/skip waiting)
2. `fetchFreshShell` untuk pastikan asset baru tersedia
3. `cleanAppShellCaches` (hanya app-shell, jaga Firebase/messaging)
4. Reload

Phase 6 menambah:
- Validasi checksum ringan: setelah `fetchFreshShell` bandingkan header `etag`/`last-modified` sebelum lanjut clear cache. Bila fetch gagal, batalkan clear dan lempar error → retry.
- Marker `app_last_updated` dipertahankan untuk snackbar sukses.

## 9. Monitoring

Ekspos via context (tanpa UI baru wajib):
`currentVersion`, `minSupportedVersion`, `deploymentType`, `countdownActive`, `updateStarted`, `updateCompleted`, `updateFailed`, `cacheCleared`, `assetsDownloaded`, `reloadFinished`.
Log konsol `[UpdateProcess]` diperluas dengan tag tipe deployment & retry.

## 10. Multi-Device & Background

- Realtime subscription Phase 5 sudah lintas device.
- App resume: `VersionCheckContext` sudah panggil `checkNow()` pada `visibilitychange` + `Capacitor App state`. Ditambah: bila `deploymentType==="force"` saat resume → langsung buka ForceUpdateDialog tanpa snackbar.

## Yang TIDAK Diubah

- Session/auth (localStorage Supabase tetap utuh; hanya app-shell caches dibersihkan).
- Routing publik & auth callback.
- Edge functions massal (hanya helper dibuat + apply selektif; retrofit menyeluruh = Phase 7).
- Tidak ada maintenance mode, deployment history, rollback, atau analytics (Phase 7).

## Berkas Baru

- Migration `add_deployment_type_to_app_releases.sql`
- `src/lib/httpVersionHeaders.ts`
- `src/components/update/ForceUpdateDialog.tsx`
- `src/components/update/PendingWorkPrompt.tsx`
- `src/components/update/VersionEnforcementGate.tsx`
- `supabase/functions/_shared/versionGate.ts`

## Berkas Diubah

- `src/components/admin/AppVersionManager.tsx` (radio deployment type)
- `src/services/versionRegistry.ts`, `versionCheck.ts`, `versionRealtime.ts`, `updateProcess.ts`
- `src/contexts/VersionCheckContext.tsx`
- `src/components/update/UpdateDialogHost.tsx`, `UpdateAvailableToast.tsx`, `UpdateDialog.tsx`
- `src/App.tsx` (mount `VersionEnforcementGate`), `src/main.tsx` (install fetch interceptor)

## Hasil Akhir

Owner memilih Optional / Recommended / Force saat publish. Client menerima event realtime dan bereaksi sesuai tipe: snackbar, dialog "Nanti/Update", atau full-screen countdown yang tidak dapat ditutup. Pending form/upload diamankan sebelum reload. Session login tetap aktif. Request API membawa header versi; jika server menolak (`426`), client masuk mode Force. Halaman privat diblokir untuk versi di bawah minimum. Retry otomatis, dan tombol Hubungi Administrator muncul saat gagal berulang.
