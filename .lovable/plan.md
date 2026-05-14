# Perbaikan Link Review Pelanggan

## Masalah saat ini
1. **Klik link `{link}` langsung "Terima kasih"** (gambar 2), bukan form rating + tanggapan (gambar 1).
   - Penyebab: RPC `get_review_booking_info` menandai `already_submitted = true` jika *ada baris review apa pun* untuk booking — termasuk draft review yang dibuat admin lewat dialog "Input Review". Sehingga begitu admin menyentuh booking, customer terkunci.
2. **Hasil review pelanggan tidak muncul di beranda "Kata Pelanggan"**.
   - Penyebab: View `public_reviews` membaca dari `activity_logs` (type='review'), tetapi `submit_customer_review` hanya menulis ke `booking_reviews` — tidak menulis ke `activity_logs`. Akibatnya review form publik tidak pernah tampil di Testimonials.

## Yang akan diubah

### 1. Migration SQL
- **`get_review_booking_info`**: ubah `already_submitted` agar `true` hanya bila sudah ada review dari `submitted_via = 'customer_form'`. Draft admin tidak lagi mengunci form pelanggan.
- **`submit_customer_review`**: jadikan upsert-aware:
  - Jika belum ada baris → INSERT (perilaku saat ini).
  - Jika ada baris admin (submitted_via ≠ 'customer_form') → UPDATE rating/review/submitted_via='customer_form'/submitted_at=now().
  - Jika sudah ada baris customer_form → tetap kembalikan `already_submitted` (1 customer = 1 submission).
  - Setelah sukses, **insert ke `activity_logs`** (`type='review'`, metadata: rating, review, service_name, branch, booking_id) supaya muncul di view `public_reviews` (otomatis tampil di Testimonials beranda untuk rating ≥ 4).

### 2. Tidak ada perubahan UI
- `PublicReviewForm.tsx` sudah persis seperti gambar 1 (rating bintang + textarea tanggapan + tombol Kirim). Tidak perlu disentuh — sekarang akan selalu terbuka untuk pelanggan.
- `Testimonials.tsx` sudah membaca `public_reviews` dan menandai badge "Verified" untuk review asli — otomatis menampilkan review baru tanpa perubahan.

## Detail teknis
- File migration baru: `supabase/migrations/<ts>_public_review_form_fixes.sql` berisi `CREATE OR REPLACE FUNCTION` untuk dua RPC di atas.
- Activity log insert dilakukan inline di `submit_customer_review` (SECURITY DEFINER) supaya bypass RLS dan konsisten dengan jalur lain.
- Tidak ada perubahan secrets / edge function.

## Verifikasi setelah implement
1. Buka `https://www.bengkelstroban.com/review/<token>` untuk booking yang sudah pernah disentuh admin → harus tampil form (gambar 1), bukan Terima kasih.
2. Submit rating 5 + tanggapan → muncul "Terima kasih" (gambar 2).
3. Reload beranda → review baru muncul di section "Kata Pelanggan" dengan badge **Verified**.
4. Buka link yang sama lagi setelah pelanggan submit → tampil "Terima kasih" (sudah di-lock untuk submission ke-2).
