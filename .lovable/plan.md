# Perbaikan Sesuai 5 Permintaan

## 1. Hilangkan layar permission Lovable saat login Google (gambar 1)

Layar "Grant permission to Stroban Membership" muncul karena project sekarang memakai **Managed Google OAuth** Lovable Cloud — broker `oauth.lovable.app` menampilkan layar persetujuan sendiri sebelum tokens diserahkan ke aplikasi.

Cara menghilangkannya: pindah ke **Bring Your Own Credentials (BYOK)** — pakai Client ID & Secret Google milik bengkel sendiri di Google Cloud Console. Setelah BYOK aktif, broker Lovable berhenti menampilkan layar consent karena Google langsung yang menangani izin (dengan branding Stroban).

Langkah:
1. Buka Google Cloud Console → buat OAuth Client (Web Application).
2. Tambahkan Authorized redirect URL dari backend Auth Settings (akan ditampilkan saat user pilih "Use your own credentials").
3. Masukkan Client ID + Secret di backend → Auth Settings → Google.
4. Tidak ada perubahan kode (sudah memakai `lovable.auth.signInWithOAuth("google", …)` di `Auth.tsx`/`LoginDialog.tsx`).

Setelah disetel, Google langsung memunculkan akun bengkel sebagai pemilik resmi tanpa layar broker.

> Catatan: tidak bisa dihilangkan via kode — wajib lewat Auth Settings.

## 2. Sinkron logo dengan dashboard branding (gambar 2)

Sudah ada manajer di `/dashboard/marketing/branding` (`BrandingManager.tsx`) untuk:
- Logo Utama (light)
- Logo Putih (dark)
- **Favicon** (yang muncul di Google search)
- Site title & description

Sinkronisasi dilakukan global oleh `BrandingSync.tsx` (sudah update favicon, title, og:image, apple-touch-icon real-time dari tabel `app_branding`).

Aksi: tidak perlu perubahan kode. Cukup upload favicon resmi Stroban (logo mobil biru) di `/dashboard/marketing/branding`. Setelah Google re-crawl, hasil pencarian akan memakai favicon baru.

Saya akan menambahkan **hint** kecil di BrandingManager menjelaskan bahwa favicon yang dipakai Google search berasal dari sini, supaya jelas.

## 3. Perbaiki label "Dikonfirmasi" terpisah (gambar 3)

Komponen: `src/pages/MyBooking.tsx` baris ~335-341 (label step di hero "STATUS BOOKING").

Sebab: `text-[10px] leading-none` di kolom grid sempit (5 kolom, mobile 360px) membuat kata 12-huruf "Dikonfirmasi" patah baris dan huruf "i" tunggal jatuh ke baris bawah.

Fix:
- Ganti label `"Dikonfirmasi"` → `"Konfirmasi"` (lebih pendek, makna jelas) di `STATUS_STEPS`.
- Pada `<span>` label tambahkan `whitespace-nowrap` agar tidak pecah, dan naikkan `leading-tight`.
- Sinkronkan juga label di `BookingStatus.tsx` & `bookingStatus.ts` agar konsisten.

## 4. Hapus UUID di bawah nama paket pada invoice (gambar 4)

File: `src/pages/InvoiceView.tsx` baris 181.

Sekarang menampilkan: `{item.type} × {item.quantity}` — `item.type` ternyata berisi UUID layanan (`Ff509130-C454-…`), bukan kata seperti "service".

Fix: hapus baris UUID, ganti dengan teks ringkas `Qty: {item.quantity}` (atau hanya `× {item.quantity}` jika quantity > 1). Hasilnya:

```text
Paket Servis Gold              Rp
                               1.675.000
```

## 5. Perbaiki warning console (gambar — error tersirat)

Tidak ada runtime error. Yang ada: warning Radix `Missing 'Description' or 'aria-describedby' for {DialogContent}`.

Fix: tambahkan `<DialogDescription>` (atau `aria-describedby`) di dialog-dialog yang belum punya. Saya cari dialog tanpa description di project (kemungkinan `LoginDialog`, `CancelDialog`, dll.) lalu tambahkan deskripsi pendek atau `aria-describedby={undefined}` di `DialogContent`.

## Ringkasan file yang akan diubah

- `src/pages/MyBooking.tsx` — label "Konfirmasi" + whitespace-nowrap
- `src/pages/BookingStatus.tsx` — label sama untuk konsistensi
- `src/lib/bookingStatus.ts` — label sama
- `src/pages/InvoiceView.tsx` — hapus UUID di item
- `src/components/admin/BrandingManager.tsx` — hint kecil tentang Google favicon
- Beberapa file dialog — tambah `DialogDescription` untuk hilangkan warning

Tidak ada perubahan database/RLS/edge function. Untuk OAuth consent (#1) user perlu menyetel BYOK Google di Auth Settings backend.
