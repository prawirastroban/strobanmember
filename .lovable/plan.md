## Lokasi pengaturan tampilan WA

Teks WhatsApp yang Anda lihat ("Halo Indra Stroban 👋 ...") **saat ini di-hardcode** di edge function `supabase/functions/send-review-reminders/index.ts` baris 172–176. Karena itu belum bisa diubah dari panel admin — harus lewat kode.

## Tujuan flow baru

1. Pelanggan terima WA → klik link unik
2. Buka halaman publik dengan form sederhana: pilih **Rating bintang (1–5)** + **Keluhan/Tanggapan** (opsional) → submit
3. Hasil masuk ke `booking_reviews` otomatis (status `pending_admin_review`)
4. Admin di panel "Follow-up Review" melihat hasil submit dari pelanggan, lalu bisa **edit/lengkapi** sebelum finalisasi
5. Template pesan WA & link bisa diatur dari panel admin (tidak hardcode lagi)

## Yang akan dibangun

### 1. Database (migration baru)

- Tambah kolom di `booking_reviews`:
  - `submission_token` (text, unique) – token rahasia untuk link publik
  - `submitted_via` (text: `customer_form` | `admin_manual`)
  - `submitted_at` (timestamptz)
- Tambah row baru di `app_settings`:
  - key `review_reminder_template` → `{ message: "Halo {name} 👋\n\n...", include_link: true }`
  - Mendukung placeholder `{name}`, `{service}`, `{branch}`, `{link}`
- RLS: tambah policy `INSERT` publik untuk `booking_reviews` **hanya jika** `submission_token` cocok dengan booking (via SECURITY DEFINER function `submit_customer_review(token, rating, text)`)

### 2. Edge function `send-review-reminders`

- Baca `review_reminder_template` dari `app_settings` (fallback ke teks default jika kosong)
- Generate `submission_token` (uuid pendek) saat kirim, simpan di `bookings.review_submission_token`
- Render placeholder `{link}` → `https://bengkelstroban.com/review/{token}`
- Pesan WA jadi pendek: rating + link langsung

### 3. Halaman publik baru `/review/:token`

- File: `src/pages/PublicReviewForm.tsx` + route di `App.tsx`
- Tanpa login. Tampilkan: nama pelanggan + service (read-only), 5 bintang, textarea keluhan, tombol Kirim
- Panggil RPC `submit_customer_review(token, rating, text)` 
- Setelah sukses: tampilkan thank-you screen
- Anti double-submit: token sekali pakai

### 4. UI Admin

**a. Panel pengaturan template** (di `ReviewReminderSettings.tsx` – tambah tab/section):
- Textarea untuk edit template pesan dengan helper placeholder
- Toggle "Sertakan link form review"
- Preview pesan dengan data dummy

**b. Panel `ReviewFollowUpPanel.tsx`**:
- Booking yang sudah ada submisi pelanggan ditandai badge **"📩 Sudah dijawab pelanggan"** (warna hijau)
- Klik "Input Review" → `ManualReviewDialog` auto-prefill rating & keluhan dari submisi pelanggan
- Admin tinggal verifikasi/lengkapi (kategori kualitas, rekomendasi, catatan internal) lalu Simpan

### 5. i18n

Tambah key untuk halaman publik `/review/:token` (id + en).

## Yang TIDAK berubah

- Mekanisme cron/jadwal otomatis & circuit-breaker Fonnte (sudah jalan baik)
- Struktur `ReviewFollowUpPanel` (hanya tambah badge & prefill)
- Auth: halaman `/review/:token` sengaja publik, security via token unik + RLS

## Test setelah implementasi

1. Buka pengaturan → ubah template, simpan → kirim dry-run, pastikan teks baru muncul di response
2. Kirim WA test ke 1 nomor → klik link → submit rating 4 + tanggapan
3. Cek panel admin → booking muncul dengan badge hijau, klik Input Review → form ter-prefill
4. Coba submit ulang link yang sama → harus ditolak (token sekali pakai)
