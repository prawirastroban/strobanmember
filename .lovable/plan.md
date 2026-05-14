## Rencana: Kontrol Jadwal Otomatis Reminder Review (WA)

### Tujuan
Admin dapat **mengaktifkan / menonaktifkan jadwal otomatis** pengiriman WA reminder review, mengatur **jam kirim** harian, serta **menjalankan test manual** langsung dari Dashboard untuk memverifikasi token Fonnte berfungsi.

---

### 1. Database

Tabel pengaturan baru: **`app_settings`** (key/value sederhana, hanya admin yang boleh akses)
- `key` (text, primary key)
- `value` (jsonb)
- `updated_at`, `updated_by`

Seed awal untuk fitur ini (key: `review_reminder_schedule`):
```json
{ "enabled": false, "hour": 10, "minute": 0 }
```

RLS:
- `SELECT`: admin & staff
- `INSERT/UPDATE`: admin saja (pakai `has_role`)

Aktifkan ekstensi `pg_cron` & `pg_net`, lalu daftarkan **1 cron job** yang berjalan tiap menit. Cron memanggil edge function `send-review-reminders` dengan `X-Cron-Secret`. Edge function membaca `app_settings.review_reminder_schedule`:
- jika `enabled = false` → langsung exit (return `{skipped: true}`)
- jika jam:menit sekarang ≠ jadwal → exit
- jika cocok → jalankan loop kirim reminder seperti sekarang

Pendekatan ini **menghindari membuat/menghapus cron berulang** saat user toggle, dan tetap aman karena gating dilakukan di edge function.

Tambahan secret yang sudah ada: `FONNTE_TOKEN` ✅. Akan ditambahkan: `CRON_SECRET` (auto-generate di sisi insert cron, disimpan via `secrets--add_secret`).

### 2. UI Panel Pengaturan

Komponen baru: **`ReviewReminderSettings.tsx`** (admin only) — ditempatkan di dalam `ReviewFollowUpPanel` (saat panel di-expand) atau di tab terpisah pada CRM Dashboard.

Isi:
- **Switch**: "Aktifkan WA reminder otomatis"
- **Time picker**: jam kirim harian (default 10:00)
- Tombol **"Simpan"** → update `app_settings`
- Tombol **"Kirim Test Sekarang"** → memanggil `send-review-reminders` langsung (bypass jadwal, mode `force=true`) dan menampilkan hasil (jumlah terkirim, error) dalam toast.
- Indikator status: "Aktif – kirim setiap hari 10:00" / "Nonaktif"
- Link kecil "Lihat log pengiriman" → membuka activity_logs filter type=`review`.

### 3. Edge Function — modifikasi

`supabase/functions/send-review-reminders/index.ts`:
- Tambah pembacaan `app_settings.review_reminder_schedule`
- Tambah parameter `force` (body JSON): kalau `true`, lewati gating jadwal (untuk tombol Test)
- Auth: tetap dukung `X-Cron-Secret` (untuk cron) dan admin/staff JWT (untuk panel test)
- Tambah field `dry_run` (opsional) supaya bisa simulasi tanpa kirim WA → list target saja

### 4. Test fitur (dilakukan otomatis setelah implementasi)

1. **Verifikasi token Fonnte** → panggil edge function `send-review-reminders` dengan `dry_run=true` lewat `curl_edge_functions`, pastikan response menampilkan daftar target tanpa error config.
2. **Test asli** → `force=true, dry_run=false` ke 1 booking dummy (atau booking completed yang ada) → cek WA terkirim & `review_reminder_sent_at` ter-update.
3. **Cek aktivitas** → query `activity_logs` untuk entry `type='review'`.
4. **Cek toggle** → set `enabled=false`, panggil function tanpa force → harus return `{skipped: true}`.

### 5. File yang akan dibuat / diedit

**Baru:**
- `supabase/migrations/<ts>_app_settings.sql`
- `src/components/admin/ReviewReminderSettings.tsx`

**Diedit:**
- `supabase/functions/send-review-reminders/index.ts` (gating + force + dry_run)
- `src/components/admin/ReviewFollowUpPanel.tsx` (mount tombol Settings + Test)
- `src/i18n/id.ts` & `en.ts` (label baru, opsional)

### Di luar lingkup
- Tidak menambah multi-jadwal (hanya 1 jam per hari).
- Tidak mengirim ulang ke booking yang `review_reminder_sent_at` sudah terisi.
- Tidak memindah tombol settings ke menu workspace; tetap dalam panel CRM/Bookings.
