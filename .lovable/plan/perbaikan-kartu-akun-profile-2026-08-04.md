# Perbaikan Kartu Akun (/profile)

Dua hal: banner "Join STROBAN PREMIUM Club" yang tampil putih polos, dan posisi kartu identitas yang belum cukup naik menimpa foto banner seperti mockup.

## 1. Banner Premium Club tidak berwarna

Saat ini banner memakai kelas warna mentah (`from-amber-500 to-yellow-400`, `text-white`) yang bukan token desain, sehingga di sebagian tema/build warnanya tidak tampil dan jadi putih polos.

Perbaikan:
- Tambahkan token `--gradient-premium` (oranye ke kuning emas) dan `--premium-foreground` di `src/index.css` untuk mode terang dan gelap.
- Banner memakai token itu lewat kelas utilitas kecil (mis. `.bg-premium`) atau `style` yang membaca variabel, bukan kelas warna hardcoded.
- Teks dan ikon panah pakai `--premium-foreground` agar kontras di kedua tema.

## 2. Kartu identitas naik ke atas gambar

- Banner foto tetap, kartu identitas digeser lebih ke atas (offset negatif diperbesar dari 64px ke sekitar 88-96px) sehingga sekitar setengah kartu menimpa foto, persis mockup.
- Padding bawah banner disesuaikan agar tidak ada celah putih di antara foto dan kartu.
- Jarak kartu ke grup menu di bawahnya tetap sama; hanya offset atas yang berubah.

## Catatan teknis

- File yang diubah: `src/pages/Profile.tsx` dan `src/index.css`.
- Tidak ada perubahan data, query poin, upload avatar, dialog edit, maupun logout.
