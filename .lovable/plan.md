# Rapikan tampilan Buat SPK (HP, tablet, desktop)

## Masalah
1. Pilihan Sumber Data (Booking / Pelanggan / Walk-in) menumpuk di HP: tombol "Pelanggan" dan "Walk-in" jatuh ke bawah dan menimpa tulisan keterangan.
2. Di aplikasi Android, judul "Buat SPK Ban" dan tombol kembali bertabrakan dengan jam dan ikon baterai di bagian paling atas layar.

## Yang diubah
- Pilihan Sumber Data selalu tampil sejajar dalam satu baris tiga tombol yang sama lebar, di HP sampai desktop. Teks dan ikonnya tetap muat dan tidak menimpa keterangan di bawahnya.
- Bagian atas (tombol kembali + judul) diberi jarak aman dari jam/baterai HP, sehingga tidak tertabrak di Android maupun iPhone. Tampilan di web tetap sama.
- Pemeriksaan menyeluruh halaman Buat SPK (Service dan Ban) di ukuran HP (393px), tablet (768px), dan desktop (1280px): kotak Scan, Cabang & Prioritas, Form Pelanggan Ban, dan tombol Batal/Buat SPK di bawah. Apa pun yang terpotong, menumpuk, atau tidak sejajar akan dirapikan.

## Detail teknis
- `SPKNewForm.tsx` baris ~1055: `TabsList` default `h-10` membuat grid `grid-cols-1` meluap. Ganti ke `grid h-auto w-full grid-cols-3 gap-1 p-1`, trigger `min-w-0 px-2 text-xs sm:text-sm` dengan ikon `shrink-0` dan label `truncate`.
- Header baris ~986: tambah `pt-[env(safe-area-inset-top)]` agar tidak tertimpa status bar.
- Verifikasi Playwright pada tiga ukuran layar untuk `?type=ban` dan `?type=service`.
