## Konteks — apa yang sudah ada

Sistem notifikasi sebagian sudah berdiri:

- Tabel `public.notifications` (realtime ON, trigger `trg_dispatch_notification` → edge function `dispatch-notification` → FCM).
- Hook: `useAppBadge` (Badging API), `useWebPush`, `usePushNotifications` (Capacitor), `useNotificationPrefs`.
- UI: `NotificationBell` (popover, 20 terakhir).
- Trigger DB: `notify_staff_on_new_booking`, `notify_booking_status_change`, `notify_payment_status_change`, `notify_invoice_created`, `notify_loyalty_points`, `notify_tire_order`, `notify_vehicle_added`, `notify_staff_new_registration`.
- Edge: `dispatch-notification`, `register-push-token`.

Yang **belum** ada / belum sesuai aturan baru:
- Tidak ada konsep **priority**, **category**, **action_url** kanonik di tabel.
- Tidak ada **smart delivery** (push tetap dikirim walau user lagi buka halaman terkait → duplikat).
- Tidak ada halaman **Notification Center** dengan filter All / Unread / Critical / per-kategori.
- Banyak source di daftar belum punya trigger (complaint, correction_request, bug, slot full, pickup, promo, voucher expiring, reward redeemed, refund, referral commission, daily/weekly/monthly report, audit/security alert, integration error).
- Belum ada API tunggal (`create_notification` RPC) yang wajib dipakai semua modul.

## Tujuan plan ini

Menjadikan satu **Notification Engine** sebagai sumber tunggal: setiap notifikasi baru (dari trigger DB, edge function, atau client) jalan lewat path yang sama → otomatis realtime, badge, push (kecuali user sedang di halaman terkait), dan masuk Notification Center.

Saya pecah jadi 4 fase agar bisa di-review per langkah. **Plan ini hanya fase 1 + fase 2** (fondasi + smart delivery + center). Fase 3 (trigger source baru per modul) dan fase 4 (digest report) saya minta approval terpisah supaya bisa cek dampak per modul.

---

## Fase 1 — Skema & Engine Tunggal

### Migrasi DB

1. `notifications` tambahan kolom:
   - `priority text not null default 'medium'` (`critical|high|medium|low`) + CHECK.
   - `category text not null default 'system'` (`booking|customer|operations|marketing|finance|reporting|system`) + CHECK.
   - `action_url text` (kanonik; menggantikan `metadata.redirect_to` ke depan, lama tetap dibaca sebagai fallback).
   - `source text` (mis. `notify_booking_status_change`, `manual`, `edge:dispatch-report`) untuk audit.
   - Index: `(user_id, is_read, created_at desc)`, `(user_id, category)`.

2. Tabel baru `public.user_presence` (untuk smart delivery):
   - `user_id uuid pk`, `session_id text`, `current_route text`, `last_seen timestamptz default now()`, `updated_at`.
   - PK gabungan `(user_id, session_id)` agar multi-device.
   - RLS: user hanya boleh upsert / select rownya sendiri; service_role full.
   - GRANT `SELECT, INSERT, UPDATE, DELETE` ke `authenticated`; `ALL` ke `service_role`.

3. Fungsi `public.create_notification(...)` (SECURITY DEFINER):
   - Param: `_user_id, _title, _message, _type, _category, _priority, _action_url, _metadata, _source`.
   - Insert ke `notifications`; trigger lama (`trg_dispatch_notification`) tetap jalan.
   - Validasi enum, default `category` di-infer dari `_type` bila kosong (booking* → booking, payment* → finance, dst — tabel kecil di body fungsi).
   - GRANT EXECUTE ke `authenticated` (untuk client trusted ops) dan `service_role`.

4. Update **semua** trigger `notify_*` lama (8 fungsi) supaya ikut mengisi `category`, `priority`, `source`. Tidak mengubah perilaku, hanya menambah kolom.

### Edge function `dispatch-notification`

- Baca `current_route` aktif user dari `user_presence` (last_seen < 30 dtk).
- Hitung **page-relevance** menggunakan helper sama dengan `resolveNotificationRoute`: bila ada session aktif yang route-nya `startsWith(action_url)` → **skip push**, tetap log "skipped:viewing".
- Tetap kirim push bila tidak ada session relevan.
- Priority `critical` mem-bypass smart-delivery (selalu push).

### Konvensi developer (tertulis di header `dashboardMenu.ts` & file engine)

- Modul baru **wajib** memanggil `public.create_notification(...)` (atau RPC `notify(...)` wrapper di edge) — dilarang `INSERT INTO notifications` langsung di kode baru. Trigger lama tetap berlaku untuk back-compat.

---

## Fase 2 — Frontend Engine + Notification Center

### Hooks baru (`src/hooks/`)

1. `usePresenceHeartbeat.ts` — di-mount di `App.tsx`. Setiap perubahan route + tiap 20 dtk upsert `user_presence(current_route=location.pathname)`. Hapus row saat sign-out / unload.

2. `useNotifications.ts` — sumber tunggal data notifikasi untuk seluruh UI:
   - Subscribe realtime, expose `{ list, unreadCount, byCategory, markRead, markAllRead, refresh }`.
   - Toast otomatis on INSERT (kecuali halaman terkait sedang aktif — dedup dengan smart-delivery).
   - `useAppBadge` dan `NotificationBell` dimigrasikan untuk konsumsi hook ini (single source of truth).

### Komponen / Halaman

3. `src/pages/NotificationCenter.tsx` di route `/notifications`:
   - Tabs: All · Unread · Read · Critical · per-kategori (Booking, Customer, Operations, Marketing, Finance, Reporting, System).
   - Search (title/message), filter priority, infinite scroll, mark all read, bulk mark read, klik baris → `navigate(action_url)`.
   - Konsumsi `useNotifications`.

4. `NotificationBell` ditambah link "Lihat semua" → `/notifications`.

5. Auto-categorization dashboard menu sudah ada — tambahkan entry `Notification Center` di menu dashboard supaya muncul di sidebar (kategori `pusat_kontrol` lewat URL-rule baru) dan di Overview otomatis.

### Smart delivery di client

- Saat realtime INSERT diterima, hook cek `location.pathname.startsWith(notif.action_url)` → tampilkan toast ringkas (tidak duplikat dengan UI yang sedang dibuka, mis. detail booking yang re-fetch sendiri). Push sudah di-skip di server.

---

## Fase 3 — Trigger source tambahan (di-plan terpisah)

Akan saya buat plan terpisah untuk: complaint baru, correction request, bug report, slot capacity full/nearly full, pickup events, promo published, voucher expiring, reward redeemed, manual payment waiting verification, refund request, referral commission, audit warning, security alert, integration error.

Alasan dipisah: tiap trigger menyentuh tabel/edge function spesifik, perlu cek RLS & test case per modul.

## Fase 4 — Digest report (di-plan terpisah)

Daily/Weekly/Monthly report notification butuh Supabase Cron + edge function generator. Plan terpisah setelah fase 1-3 stabil.

---

## Yang TIDAK Diubah

- Tidak menghapus trigger DB lama, RLS policy lama, atau edge function lama.
- Tidak mengubah path FCM, service worker, atau `register-push-token`.
- Tidak mengubah role / has_role / RLS bookings dll.
- `metadata.redirect_to` lama tetap berfungsi (fallback bila `action_url` kosong).

## Verifikasi

- Insert notif manual → bell + badge + toast muncul realtime di tab lain.
- Buka `/dashboard/bookings`, ubah status booking dari device lain → realtime in-app muncul, push **tidak** terkirim (cek log edge function: "skipped:viewing").
- Buka halaman lain saat trigger sama → push terkirim.
- `/notifications` menampilkan semua, filter kategori & priority bekerja.
- Critical priority selalu push meski user di halaman terkait.

---

**Saya mulai dari Fase 1 (migrasi DB) — perlu approval karena menambah kolom + tabel + fungsi.** Setelah migrasi disetujui dan auto-types regen, lanjut Fase 2 (frontend) dalam satu turn. Konfirmasi untuk lanjut?
