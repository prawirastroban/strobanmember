## Goal

Verifikasi visual bahwa **BookingShareCard** (tombol WhatsApp + Salin Link + Salin Pesan) muncul di card confirmation setelah Quick Booking, dengan membuat satu booking tes memakai sesi login user di preview.

## Konteks

Kode share card sudah dipasang di **dua** entry Quick Booking admin/staff:
- `StaffQuickBookingDialog.tsx` (dipakai dari Navbar "Pesan Servis" + AdminDashboard)
- `QuickBookingDialog.tsx` (dipakai dari CustomerList & CustomerDetail "Pesan Servis untuk customer ini")

Tidak ada entry Quick Booking ketiga. Customer-facing `/booking` (`MobileBookingWizard`) adalah flow berbeda dan **bukan** target task ini.

Kemungkinan kenapa user tidak melihat tombol share:
1. Bundle JS lama ter-cache di browser/PWA (paling mungkin — ada runtime error "Importing a module script failed" = chunk hash berubah).
2. Customer dipilih masih membuka path yang belum direfresh (sama, cache).
3. Versi web yang user maksud sebenarnya flow customer di `/booking`, bukan admin Quick Booking.

## Test Plan (Browser Automation)

1. `browser--view_preview` → `/` (mobile 393×587, sesuai viewport user).
2. Hard reload via `navigate_to_url` ke preview origin + `?v=<ts>` untuk bust cache.
3. Buka Quick Booking dari Navbar ("Pesan Servis").
4. Step 1 (Customer): search dengan "085156967891" → bila customer dengan nomor itu sudah ada, pilih; jika tidak, klik "Tambah Customer Baru" dan isi:
   - Nama: "Tes Share Link"
   - Email: `tes-share-{timestamp}@bengkelstroban.com`
   - Phone: `085156967891`
5. Step 2 (Vehicle): pilih kendaraan pertama yang tersedia; jika kosong, batalkan dan laporkan (tidak buat vehicle baru untuk hindari side-effect berlebih).
6. Step 3 (Service & Schedule): pilih service termurah (mis. "Tambal Ban"), cabang pertama, tanggal = hari ini atau besok, slot pertama yang available.
7. Step 4 (Promo): skip ("Lewati & Lanjut").
8. Step 5 (Confirm): klik "Confirm Booking".
9. **Verifikasi** card confirmation muncul dengan:
   - Heading "Booking Berhasil Dibuat"
   - Input link `https://bengkelstroban.com/t/<token>`
   - Tombol **Kirim via WhatsApp** (hijau)
   - Tombol **Salin Pesan**
   - Tombol **Salin Link** (icon Copy)
   - Tombol **Booking Baru** + **Selesai**
10. Screenshot hasil → konfirmasi ke user.
11. Klik **Salin Link** untuk verifikasi toast "Link disalin".
12. Tutup dialog tanpa klik "Kirim via WhatsApp" (hindari buka tab eksternal di sandbox).

## Pasca-tes

- Jika card muncul → kasih tahu user untuk **hard refresh** browser (Cmd/Ctrl+Shift+R) atau uninstall+install ulang PWA, dan kirim screenshot bukti.
- Jika card TIDAK muncul → cek console + network, fix root cause (kemungkinan import error di `BookingShareCard.tsx` atau chunk loading), lalu re-test.
- Booking tes akan terlihat di dashboard sebagai entry baru atas nama "Tes Share Link" / nomor 085156967891 — biarkan user yang putuskan apakah mau dihapus (saya tidak hapus otomatis).

## Out of Scope

- Tidak menyentuh flow customer `/booking`.
- Tidak mengirim WhatsApp asli (hanya verifikasi tombolnya ada).
- Tidak menghapus booking tes (user kontrol).
