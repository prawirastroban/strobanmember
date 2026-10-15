# Perbaikan Tombol "Pilih Cabang" Setelah Scan SPK di HP

Setelah formulir diisi lewat Scan SPK di HP, dropdown "Pilih cabang" tidak bisa disentuh atau dibuka.

## Dugaan penyebab (belum dipastikan)
- Pop-up Scan SPK ditutup bersamaan dengan pindah ke halaman form. Di HP, pop-up kadang meninggalkan "kunci sentuh" di halaman, sehingga kontrol seperti dropdown cabang tidak merespons.
- Kemungkinan lain: dropdown tetap dalam status "memuat cabang" atau terkunci karena hasil scan mengisi nama cabang yang tidak cocok.

## Langkah
1. Reproduksi di ukuran HP (sentuhan): buka /spk/new lewat Scan SPK dan lewat tombol Scan di dalam form, lalu cek apakah halaman masih terkunci sentuh dan status dropdown cabang.
2. Perbaiki sesuai temuan:
   - Pastikan kunci sentuh dilepas saat pop-up Scan ditutup dan saat form dibuka (bersihkan sisa kunci di halaman).
   - Tunda perpindahan halaman sampai pop-up benar-benar tertutup.
   - Pastikan dropdown cabang hanya nonaktif saat memang memuat atau untuk Admin Cabang yang dikunci ke cabangnya.
   - Daftar cabang dibuat aman di HP (lebar mengikuti tombol, tidak keluar layar).
3. Uji ulang di HP: dropdown cabang terbuka, cabang bisa dipilih, dan prioritas serta field lain tetap bisa disentuh. Isian manual tidak terpengaruh.

## Detail teknis
- File: `src/components/spk/create/SPKScanDialog.tsx`, `SPKCreateModeDialog.tsx`, `src/pages/spk/SPKNewForm.tsx`.
- Bersihkan `pointer-events: none` sisa Radix di `document.body` saat mount form dan setelah dialog ditutup; navigasi setelah dialog close (setTimeout/onCloseAutoFocus).
- Verifikasi Playwright dengan `has_touch`, viewport 390x844, cek `getComputedStyle(document.body).pointerEvents` dan buka Select via tap.
- Tidak ada perubahan alur atau data SPK.
