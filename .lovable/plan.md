
# Audit Hasil — Push Token Registration

## Yang Sudah Benar
- Firebase config + VAPID hard-coded di `useWebPush.ts` (valid).
- `firebase-messaging-sw.js` ada di `public/` dan menangani background message.
- `dispatch-notification` edge function lengkap + credentials FCM tersedia (`FCM_PROJECT_ID`, `FCM_SERVICE_ACCOUNT_JSON`).
- Native (Capacitor) path memakai `register-push-token` edge function dengan benar.
- Tabel `push_tokens` lengkap (user_id, token, platform, RLS owner-only).

## Root Cause "Token Terdaftar = 0"
Audit menemukan **5 masalah berbeda**, semuanya terkait registrasi token web:

1. **Counter di PWA Settings salah** — query difilter `eq("user_id", admin.id)`, jadi hanya hitung token milik admin login, bukan total perangkat. Inilah yang membuat angka tampak "0".
2. **`useWebPush` tidak re-run setelah izin diberikan** — effect deps cuma `[user]`, hook return early kalau `Notification.permission !== "granted"`. Saat banner mengubah permission dari `default` → `granted`, hook tidak ter-trigger ulang hingga user reload halaman.
3. **FB_CONFIG dikirim ke SW lewat `reg.active?.postMessage`** — saat first-install, `reg.active` masih `null` (statusnya `installing`/`waiting`), config tidak pernah sampai, `onBackgroundMessage` tidak teregistrasi.
4. **Token "fake" di DB** — 2 row existing isinya `web-<uuid>-...` (placeholder kode lama), bukan FCM token asli. Dispatcher akan auto-prune saat coba kirim, tapi mengotori counter.
5. **Tidak ada diagnostic** — `getToken` failure cuma `console.warn`, sulit dilacak.

## Yang Akan Diperbaiki (tanpa ubah UI/bisnis)

### Phase 1 — `useWebPush` retrigger & diagnostics
- Tambah state `permission` di hook (dibaca dari `Notification.permission`) dan masuk dependency effect.
- Listen event custom `notif-permission-granted` (di-dispatch oleh banner) + `visibilitychange` untuk retry instan tanpa reload.
- Tambah structured logs: `[useWebPush] init/sw-register/get-token/upsert/error`.
- Dispatch `window` event `webpush-status` (`success` | `error` | `denied`) supaya admin panel bisa menampilkan status.

### Phase 2 — Banner trigger
`NotificationPermissionBanner.handleEnable`: setelah `Notification.requestPermission()` return `granted`, `window.dispatchEvent(new Event("notif-permission-granted"))`. Tidak mengubah UI/teks tombol.

### Phase 3 — SW FB_CONFIG delivery yang andal
Di `useWebPush`:
- Setelah `register()`, kirim FB_CONFIG ke `reg.installing`, `reg.waiting`, `reg.active`, dan `navigator.serviceWorker.controller` (mana yang ada).
- Listen `navigator.serviceWorker.addEventListener("controllerchange", ...)` & post ulang.
- Listen `statechange` pada `reg.installing` → re-post ketika jadi `activated`.

### Phase 4 — Token counter global (admin only)
- Buat RPC `public.get_push_token_stats()` (SECURITY DEFINER, return `total`, `by_platform`, `unique_users`). EXECUTE granted ke `authenticated`; di dalam fungsi cek `has_role(auth.uid(),'admin')` atau `'staff'` — kalau bukan, kembalikan hanya own count.
- `PwaSettingsManager`: ganti query own-count → panggil RPC. Tidak ada perubahan layout/label.

### Phase 5 — Bersihkan token placeholder
Data migration (via insert tool, bukan schema migration):
```sql
DELETE FROM public.push_tokens
WHERE platform = 'web' AND (token LIKE 'web-%' OR length(token) < 100);
```

### Phase 6 — Validasi event push
Setelah token asli masuk, test dengan trigger:
- Booking baru / dikonfirmasi
- Pembayaran berhasil
- Customer baru / referral / promo

Verifikasi via `supabase--edge_function_logs` (`dispatch-notification`) — pastikan response FCM `200` dan tidak ada `UNREGISTERED`.

## Tidak Akan Diubah
- UI banner, layout PWA Settings card, label, warna.
- Business logic notifikasi (`notify-*`, `dispatch-notification` payload).
- URL/permission/RLS push_tokens (kecuali tambah 1 RPC read-only).
- Native (Capacitor) push flow (sudah benar).

## Files Yang Akan Disentuh
- `src/hooks/useWebPush.ts` (edit — fix permission deps, SW config retry, diagnostics)
- `src/components/NotificationPermissionBanner.tsx` (edit — dispatch event setelah grant)
- `src/components/admin/PwaSettingsManager.tsx` (edit — pakai RPC untuk counter)
- migration baru: `get_push_token_stats()` RPC
- data cleanup: DELETE token fake

## Pertanyaan Sebelum Implement
1. Counter global token (Phase 4) — boleh hitung **semua user** (admin/staff lihat total perangkat keseluruhan), atau **scope per branch** untuk `admin_cabang`?
2. Phase 5 cleanup — hapus langsung 2 row placeholder, atau biarkan dispatcher auto-prune saat kirim pertama?
