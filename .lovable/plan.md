# Satukan Tampilan Status Servis ke Halaman Booking Detail

Saat ini tombol "Status" di header dan pop-up floating status mengarah ke dua halaman berbeda ketika servis sedang dikerjakan:

- Tombol Status -> halaman Live Service Progress (gambar pertama: daftar tahap Dikonfirmasi/Pengerjaan/Selesai)
- Floating status -> halaman My Booking Detail (gambar kedua: indikator Live, progress bar 5 tahap, total tagihan)

Target: semua jalur masuk menampilkan tampilan gambar kedua (My Booking Detail).

## Perubahan

1. Tombol Status di header: hapus percabangan `in_progress`, selalu buka `/my-booking/:id` (khusus SPK menunggu persetujuan tetap ke halaman approve SPK).
2. Floating status pengerjaan: sama, selalu buka `/my-booking/:id`.
3. Jalur lain yang masih melempar ke Live Progress disamakan agar konsisten: kartu riwayat perawatan, halaman status booking setelah dikonfirmasi, dan redirect setelah persetujuan SPK.
4. Halaman Live Service Progress tidak dihapus (rute tetap ada agar tautan lama tidak rusak), hanya tidak lagi dituju dari tombol-tombol di atas.

## Catatan Teknis

Berkas yang disentuh: `src/components/Navbar.tsx`, `src/components/FloatingServiceStatus.tsx`, `src/pages/HistoryPerawatan.tsx`, `src/pages/BookingStatus.tsx`, `src/pages/spk/SPKCustomerApprove.tsx`. Hanya perubahan target navigasi, tanpa perubahan data, RLS, atau logika status booking.