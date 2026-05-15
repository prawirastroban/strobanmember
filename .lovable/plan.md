## Masalah

Pada halaman `/payment/manual/:bookingId` (komponen `src/pages/ManualPayment.tsx`):

1. Validasi file terlalu ketat: foto dari galeri HP (HEIC/HEIF) atau file tanpa ekstensi membuat `file.type` kosong → langsung ditolak ("Format hanya JPG/PNG/WEBP/PDF").
2. Path upload `${user.id}/${bookingId}/${Date.now()}.${ext}` mengambil `ext` dari `file.name.split(".").pop()`. Jika nama file tidak punya titik (umum di iOS), `ext` jadi seluruh nama file → Storage menolak / membuat path aneh.
3. `upsert: false` + `Date.now()` cukup aman, tapi error storage hanya ditampilkan apa adanya tanpa konteks ("upload gagal: …") sehingga user bingung.
4. Setelah submit, user diarahkan ke `/my-booking/:id`, tapi di halaman itu **tidak ada thumbnail / link bukti** yang sudah dikirim. User tidak yakin file-nya sampai.
5. Admin sudah bisa lihat bukti via thumbnail di `ManualPaymentManager`, tapi PDF dan zoom belum ada viewer — link biasa, dan bila browser blok pop-up jadi macet.

## Rencana Perbaikan

### A. `src/pages/ManualPayment.tsx` — robust upload
- Ganti validasi MIME jadi: terima `image/*` & `application/pdf`. Jika `file.type` kosong, fallback ke ekstensi nama file untuk menentukan jenis.
- Sanitasi `ext`:
  ```
  const dot = file.name.lastIndexOf(".");
  const rawExt = dot > -1 ? file.name.slice(dot + 1) : "";
  const mimeExt = file.type.split("/")[1] || "";
  const ext = (rawExt || mimeExt || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  ```
- Naikkan limit 5MB → 10MB (foto kamera HP modern sering >5MB).
- Tampilkan preview thumbnail file yang dipilih sebelum kirim (img URL.createObjectURL untuk image, ikon PDF untuk pdf).
- Tampilkan pesan error storage spesifik (mis. "Bucket tidak tersedia", "File terlalu besar", "Tidak diizinkan").
- Setelah submit sukses, **jangan langsung navigate**. Tampilkan kartu sukses dengan thumbnail bukti yang baru di-upload + tombol "Kembali ke Booking".
- Saat halaman dimuat dan sudah ada `latestProof`, tampilkan thumbnail/PDF link bukti terakhir di kartu status (biar user yakin sudah terkirim).

### B. `src/pages/MyBooking.tsx` — link & bukti di halaman booking
- Bila `payment_status` = `awaiting_confirmation` atau `unpaid` dengan metode manual:
  - Tampilkan kartu kecil "Bukti Pembayaran" dengan thumbnail (atau ikon PDF) + tombol "Lihat" (buka full‑screen Dialog) dan "Upload Ulang" (link ke `/payment/manual/:id`).
- Bila belum ada bukti tapi metode `transfer/qris`, tampilkan tombol "Upload Bukti Transfer" → `/payment/manual/:id`.

### C. `src/components/admin/keuangan/ManualPaymentManager.tsx` — viewer bukti yang lebih baik
- Ganti `<a target="_blank">` jadi tombol yang membuka Dialog full-screen:
  - Untuk gambar: `<img>` zoomable (pakai object-contain, max-h 80vh).
  - Untuk PDF: `<iframe src={proof_url}>` dengan tinggi 80vh + tombol "Buka di tab baru".
- Tambah tombol "Salin URL" dan "Download" (anchor `download`).
- Validasi PDF tidak hanya via `endsWith(".pdf")` (URL Storage punya query string) — cek juga MIME jika tersedia atau substring `.pdf?`/`.pdf`.

### D. Verifikasi storage policy
- Jalankan query ringan untuk memastikan bucket `payment-proofs` masih `public = true` dan policy upload `auth.uid()::text = (storage.foldername(name))[1]` masih aktif (sudah dicek: ada). Tidak perlu migrasi.

## Yang TIDAK diubah
- Tidak mengubah RLS, RPC `submit_manual_payment_proof`, atau struktur tabel `manual_payment_proofs`.
- Tidak mengubah flow Midtrans.
- Branding & desain tetap (glassmorphism, primary red).

## File yang akan dimodifikasi
- `src/pages/ManualPayment.tsx`
- `src/pages/MyBooking.tsx`
- `src/components/admin/keuangan/ManualPaymentManager.tsx`

Tidak ada file baru, tidak ada migrasi DB.