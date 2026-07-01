# Phase 5 — Real-Time Update Manager

Menyambungkan Version Registry ke Supabase Realtime sehingga event `APP_VERSION_UPDATED` sampai ke seluruh client aktif tanpa polling. Tidak menyentuh auth, routing, session, atau API existing.

## 1. Aktifkan Realtime pada `app_releases`

Migration ringan:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_releases;
```
(Idempotent guard bila sudah ada.) Tidak ada perubahan skema/kolom/policy.

## 2. Service Baru — `src/services/versionRealtime.ts`

Bertanggung jawab satu-satunya untuk channel realtime versi.

Ekspor `subscribeAppVersionUpdates(onEvent, onStatus)` yang:
- `supabase.channel("app_version_updates")`
- Listen `postgres_changes` INSERT/UPDATE pada `public.app_releases` dengan filter `deployment_status=eq.published`.
- Bentuk payload `AppVersionEvent`: `{ version, build, releaseDate, deploymentId, releaseType, forceUpdate:false, releaseNotesSummary }` (map dari row `app_releases`; `forceUpdate` hardcoded `false` — akan diaktifkan Phase 6).
- Status callback: `connected | disconnected | reconnecting` dari `channel.subscribe((status)=>…)` + auto-reconnect built-in Supabase Realtime (tidak menambahkan setInterval polling).
- Kembalikan fungsi cleanup.

## 3. Perluas `VersionCheckContext`

Tambahkan ke state (tanpa breaking change existing consumers):
- `realtimeConnected: boolean`
- `lastEventAt: string | null`
- `lastVersionEvent: AppVersionEvent | null`
- `connectionStatus: "connected"|"disconnected"|"reconnecting"|"idle"`
- `reconnectCount: number`

Perilaku baru di provider:
- Subscribe ke `subscribeAppVersionUpdates` sekali saat mount (tetap hidup lintas route: Dashboard, CRM, Booking, Inventory, Report, Settings — provider tinggal di root).
- Saat event masuk: bandingkan `event.build` vs `APP_BUILD_NUMBER` (fallback ke `event.version` semver). Bila lebih tinggi → set `isUpdateAvailable=true`, update `serverVersion/serverBuild/releaseNotes/releaseDate/releaseChannel`, `lastVersionEvent`, `lastEventAt`.
- Reset `updateDialogShown=false` bila `serverBuild` yang baru > `serverBuild` sebelumnya (agar dialog bisa muncul lagi untuk versi lebih baru).
- Saat status berpindah `disconnected → connected` (reconnect): naikkan `reconnectCount`, panggil `checkNow()` untuk rekonsiliasi (mengatasi event yang terlewat saat offline).
- Semua transisi diberi `console.info` terstruktur: `[VersionRealtime] connected|disconnected|reconnected|event_received|version_changed|notification_displayed|dialog_displayed` — konsisten sebagai jejak log.

## 4. Snackbar Notifikasi (Global)

Komponen baru `src/components/update/UpdateAvailableToast.tsx` (client-only, tanpa UI persist) yang di-mount di root sebelah `UpdateDialogHost`.
- Subscribe `useVersionCheck()`.
- Ketika `isUpdateAvailable` naik dari false→true DAN `updateDialogShown===false`, panggil `sonner`:
  ```
  toast("Versi terbaru tersedia", {
    description: `v{serverVersion} · Build {serverBuild}`,
    duration: 5000,
    action: { label: "Lihat", onClick: () => openUpdateDialog() },
  });
  ```
- "Lihat" memicu `UpdateDialog` Phase 3 melalui event bus ringan (`window.dispatchEvent(new CustomEvent("stroban:open-update-dialog"))`) yang didengarkan `UpdateDialogHost`. Ini menghindari memindahkan halaman.
- Guard: satu toast per event (pakai `useRef` melacak `deploymentId` terakhir yang di-toast).

## 5. `UpdateDialogHost` — Sedikit Penyesuaian

- Dengarkan event `stroban:open-update-dialog` untuk membuka dialog secara manual dari toast.
- Auto-open otomatis existing tetap dinonaktifkan bila toast sudah menghandle (biarkan user memilih via "Lihat"). Tidak ada reload otomatis.

## 6. Offline / Reconnect

Ditangani oleh Supabase Realtime + logika di §3:
- Saat client offline, channel akan re-subscribe otomatis.
- Saat status kembali `connected`, provider memanggil `checkNow()` (Phase 2) sebagai fallback event yang terlewat. Jika hasilnya `isUpdateAvailable`, snackbar tetap muncul.

## 7. Monitoring Internal

Nilai monitoring diekspos lewat context (`realtimeConnected`, `lastEventAt`, `lastVersionEvent`, `connectionStatus`, `reconnectCount`). Tidak menambah UI baru — cukup tersedia untuk devtools/debug panel di masa depan. Log konsol menjadi audit trail.

## Yang TIDAK Diubah

- `src/pages/*`, routing, `AuthContext`, `AuthCallback`, edge functions.
- `updateProcess.ts` (Phase 4) tidak dipanggil di phase ini.
- Tidak ada force-update, countdown, auto-refresh, cache flush, atau maintenance lock (semua Phase 6).

## Berkas yang Disentuh

- Baru: `src/services/versionRealtime.ts`, `src/components/update/UpdateAvailableToast.tsx`, satu migration SQL.
- Diubah: `src/contexts/VersionCheckContext.tsx`, `src/components/update/UpdateDialogHost.tsx`, `src/App.tsx` (mount `<UpdateAvailableToast/>`).

## Hasil Akhir

Publish New Version oleh Owner → row `app_releases` menjadi `published` → seluruh client aktif menerima event realtime → snackbar 5 detik dengan tombol "Lihat" → dialog Phase 3 dapat dibuka manual. Tidak ada reload, tidak ada logout, tidak mengganggu pekerjaan pengguna. Sistem siap untuk Force Update di Phase 6.
