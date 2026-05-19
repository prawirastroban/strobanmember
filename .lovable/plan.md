## Tujuan

Pelanggan dapat upload bukti transfer/QRIS langsung di kartu booking yang sudah `confirmed` (tanpa harus pindah halaman), dan tombol pilih file membuka **galeri foto + file dokumen** (bukan kamera) di Android/iOS.

## Perubahan

### 1. Komponen baru: `src/components/payment/InlineProofUpload.tsx`

Versi ringkas dari `ManualPayment` — hanya bagian "Upload Bukti":
- Field: Nama pengirim (prefill dari user), Bank pengirim (opsional, hanya untuk transfer), Nominal (prefill = total tagihan), Tanggal transfer (default hari ini), File bukti, Catatan.
- Validasi Zod sama seperti `ManualPayment` (min 2 char, max size 10MB, image/PDF).
- Upload ke bucket `payment-proofs` dengan path `${user.id}/${bookingId}/${ts}.${ext}`.
- Panggil RPC `submit_manual_payment_proof` (untuk transfer kirim `_bank_account_id` rekening pertama yang cocok branch; QRIS kirim `_qris_id`).
- Pada sukses → toast + callback `onUploaded(proof)` agar parent refresh `latestProof`.

**Penting (galeri di mobile):**
```tsx
<input
  type="file"
  accept="image/*,application/pdf"
  // TANPA atribut `capture` → Android/iOS menampilkan pilihan
  // "Galeri / Files / Camera" alih-alih langsung membuka kamera.
/>
```

### 2. `src/pages/MyBooking.tsx` — tampilkan upload inline saat confirmed

Pada blok "Lampiran Bukti Pembayaran" (sekitar baris 507-570), saat:
- `payAllowed` (status = confirmed / checked_in / in_progress / finishing)
- `payment_method` ∈ `transfer | qris`
- `!latestProof` (atau `latestProof.status === "rejected"`)

Ganti tombol "Upload Bukti Transfer / QRIS" yang me-link ke `/payment/manual/:id` dengan komponen `<InlineProofUpload />` langsung di kartu booking. Tetap sediakan link kecil "Buka halaman pembayaran lengkap" sebagai fallback (kalau user mau lihat rekening/QRIS lagi).

Setelah `onUploaded`, refresh `latestProof` state.

### 3. `src/pages/ManualPayment.tsx` — perbaiki picker di mobile

Input file sudah pakai `accept="image/*,application/pdf"` tanpa `capture`. Tambahkan hint kecil di bawah input:
> "Pilih dari Galeri atau File di HP Anda."

Tidak ada perubahan logika lain.

## Yang TIDAK diubah

- RLS storage `payment-proofs` sudah benar (user boleh insert ke foldernya sendiri).
- RPC `submit_manual_payment_proof` tidak berubah.
- Edge function tidak berubah.

## Catatan Teknis

- Atribut `capture` HTML5 (jika ada) memaksa kamera. Memastikan **tidak** ada `capture` membuat OS menampilkan picker dengan opsi Galeri + Files. Ini cukup untuk Android (Chrome/WebView Capacitor) dan iOS Safari.
- Komponen baru dipakai hanya saat booking sudah `confirmed` agar user yang masih menunggu konfirmasi tetap dipandu dulu ke pemilihan metode.
