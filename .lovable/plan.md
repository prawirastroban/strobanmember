## Rencana: Reminder Follow-up Review Pelanggan (Manual oleh Admin)

### Tujuan
Setelah booking pelanggan berstatus **selesai (completed)**, admin mendapat reminder untuk menghubungi pelanggan dan menanyakan tanggapan terhadap layanan. Admin dapat **mencatat hasil follow-up review tersebut secara manual** di Dashboard, langsung dari panel Bookings.

---

### 1. Database (migration baru)

Tabel baru: **`booking_reviews`**
- `booking_id` (relasi ke bookings, unique 1:1)
- `user_id` (pelanggan)
- `rating` (1–5 bintang)
- `review_text` (tanggapan pelanggan, ditulis ulang oleh admin)
- `service_quality` (label: puas / biasa / kecewa)
- `would_recommend` (ya / tidak / belum yakin)
- `follow_up_status` (pending / contacted / no_response / completed)
- `follow_up_method` (whatsapp / phone / in_person)
- `follow_up_at` (tanggal admin menghubungi)
- `internal_note` (catatan internal admin, tidak ditampilkan ke user)
- `created_by` (admin yang input)

Tambahan kolom di **`bookings`**:
- `review_reminder_due_at` (timestamp; otomatis terisi `completed_at + 1 hari` lewat trigger)
- `review_reminder_dismissed` (boolean; admin bisa skip jika tidak perlu follow-up)

Trigger: ketika `service_status` berubah ke `completed`, isi `review_reminder_due_at = now() + 1 day`.

RLS: hanya admin/staff yang bisa baca/tulis `booking_reviews`. User bisa lihat review-nya sendiri (read-only).

### 2. Reminder Panel di Dashboard

Komponen baru: **`ReviewFollowUpPanel`** di `/dashboard/bookings`
- Card di bagian atas BookingsManager: "Booking Selesai - Perlu Follow-up Review (N)"
- List booking yang: `service_status = completed` AND belum ada di `booking_reviews` AND tidak di-dismiss
- Setiap baris menampilkan: nama pelanggan, layanan, tanggal selesai, tombol **WhatsApp** (langsung ke nomor pelanggan dengan template pesan), tombol **Input Review**, tombol **Skip**.

### 3. Form Input Review Manual

Dialog **`ManualReviewDialog`** dibuka via tombol "Input Review":
- Rating 1–5 bintang
- Tanggapan pelanggan (textarea)
- Kualitas layanan (radio: puas/biasa/kecewa)
- Mau merekomendasikan? (radio: ya/tidak/belum yakin)
- Metode follow-up (WA/telp/langsung)
- Catatan internal (opsional)
- Save → insert ke `booking_reviews`, baris hilang dari panel reminder.

### 4. Notifikasi & Indikator

- Badge merah angka di menu sidebar "Bookings" jika ada reminder pending.
- Notifikasi DB otomatis ke admin (lewat trigger atau saat panel di-load).
- Detail booking (modal Bookings) menampilkan section "Review Pelanggan" jika sudah ada — read-only setelah disimpan, dengan tombol "Edit Review" untuk admin.

### 5. Tampilan untuk User (opsional, ringan)

Di halaman `/dashboard` user (Customer Dashboard), pada riwayat booking yang sudah ada review, tampilkan badge "Review tercatat ⭐ X" — agar pelanggan tahu tanggapannya didokumentasikan.

### 6. File yang akan dibuat / diedit

**Baru:**
- `supabase/migrations/<timestamp>_booking_reviews.sql`
- `src/components/admin/ReviewFollowUpPanel.tsx`
- `src/components/admin/ManualReviewDialog.tsx`

**Diedit:**
- `src/components/admin/BookingsManager.tsx` — mount panel + dialog
- `src/components/admin/AdminSidebar.tsx` — badge counter
- `src/integrations/supabase/types.ts` — auto
- `src/i18n/id.ts` & `src/i18n/en.ts` — label baru

### Di luar lingkup
- Tidak membuat form review publik untuk user mengisi sendiri (request user: **manual oleh admin**).
- Tidak otomatis kirim WA/email reminder ke admin (cukup indikator visual di dashboard).
- Review tidak otomatis tampil di komponen `Testimonials.tsx` publik (bisa jadi langkah lanjutan terpisah).
