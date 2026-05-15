## Tujuan

Mengubah tombol **WA** di panel "Follow-up Review Pelanggan" supaya:
1. Mengirim template review **otomatis via Fonnte** (sama seperti tombol "Kirim Sekarang" di Pengaturan), bukan membuka wa.me.
2. **Dinonaktifkan** kalau nomor HP customer tidak valid / kosong.
3. Setelah berhasil terkirim → tampil status **"✓ Sudah dikirim"** (dengan jam) menggantikan tombol.
4. Tetap menampilkan status **"📩 Sudah dijawab pelanggan"** kalau customer sudah submit form review.

## Perubahan

### 1. Edge function `send-review-reminders`
Tambah dukungan **single-target send** dari panel admin:
- Terima body baru `{ booking_ids: string[] }` (opsional). Jika ada → query bookings di-filter `id in (booking_ids)`, abaikan filter `review_reminder_sent_at is null` (admin boleh kirim ulang manual).
- `force: true` sudah ada → tetap dipakai untuk bypass jadwal.
- Logic kirim Fonnte, update `review_reminder_sent_at`, dan log activity sudah ada — reuse apa adanya.
- Response per-booking sudah ada di `results[]` → frontend baca `status === "sent"` / `"skip_invalid_phone"` / `"failed"`.

### 2. `src/components/admin/ReviewFollowUpPanel.tsx`
- Tambahkan kolom `review_reminder_sent_at` ke `select` dan ke interface `PendingBooking`.
- Helper `normalizePhone` (copy dari edge function: harus mulai `628`, panjang 11–15 digit, bukan dummy) → tentukan `isPhoneValid`.
- Ganti `openWhatsApp` → `sendReviewWA` yang memanggil `supabase.functions.invoke("send-review-reminders", { body: { force: true, booking_ids: [b.id], limit: 1, throttle_ms: 0 } })`.
  - Pada hasil `sent`: update item lokal `review_reminder_sent_at = now`, toast sukses.
  - Pada `skip_invalid_phone` / `failed` / error: toast error dengan alasan.
- Render tombol:
  - Jika `review_reminder_sent_at` ada → badge hijau **"✓ Terkirim · {jam}"** (bukan tombol).
  - Else jika `!isPhoneValid` → tombol disabled + tooltip "Nomor WA tidak valid".
  - Else → tombol "Kirim WA Review" (loading spinner saat `waBusy`).
- Tambah badge status review di samping nama:
  - `customer_submitted` → "📩 Sudah dijawab pelanggan" (sudah ada).
  - else → badge abu **"Belum review"** untuk konteks.
- Tombol "Input Review" tetap (admin bisa input manual kapan saja).

### 3. Tidak diubah
- `ReviewReminderSettings.tsx` (Kirim Sekarang massal) tetap berfungsi.
- Tidak ada perubahan schema database — `review_reminder_sent_at` & `booking_reviews` sudah ada.
- `src/lib/whatsapp.ts` tidak dipakai lagi di panel ini, tapi tidak dihapus (masih dipakai widget lain).

## File yang akan diubah
- `supabase/functions/send-review-reminders/index.ts` — terima `booking_ids`.
- `src/components/admin/ReviewFollowUpPanel.tsx` — tombol, validasi nomor, badge status terkirim.
