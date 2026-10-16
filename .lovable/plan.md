# Rapikan tombol tutup pratinjau SPK

## Temuan
- Pada gambar, tombol **X** menimpa sisi kanan tombol **Unduh**.
- Di `SPKViewDialog`, tombol Bagikan dan Unduh berada di header, sedangkan tombol tutup bawaan `DialogContent` ditempatkan secara absolut di kanan atas. Header memiliki `pr-12`, tetapi juga `sm:px-4`, sehingga ruang kanan tidak konsisten pada layar besar.

## Perubahan
1. Sembunyikan tombol tutup bawaan hanya pada jendela pratinjau SPK ini, lalu tempatkan tombol **X** tersendiri dalam susunan header, setelah Unduh. Beri label aksesibilitas **Tutup pratinjau SPK** dan area klik yang nyaman.
2. Rapikan jarak dan perataan nomor SPK, Bagikan, Unduh, dan X agar tidak saling menimpa. Nomor panjang tetap terbaca tanpa mendorong tombol keluar jendela.
3. Pada HP, susun informasi dan tombol ke dua baris bila diperlukan, dengan tombol tutup tetap mudah dijangkau. Batasi tinggi jendela mengikuti ruang layar dan pertahankan area dokumen di bawah header.
4. Pertahankan fungsi tutup, Bagikan, Unduh, dan pratinjau dokumen. Tidak mengubah data SPK, izin akses, proses scan, atau tampilan dialog lain.

## Detail teknis
- Perubahan lokal pada `src/components/spk/SPKViewDialog.tsx` menggunakan `hideClose`, `DialogClose`, serta komponen Button yang sudah tersedia.
- Hindari posisi absolut untuk tombol tutup di header; gunakan susunan flex/grid dengan dimensi tombol stabil.

## Verifikasi
- Buka pratinjau SPK dari daftar SPK dengan akun internal pada layar besar dan HP.
- Pastikan nomor SPK dan semua tombol tidak terpotong, bertumpuk, atau keluar layar, termasuk saat nomor SPK panjang.
- Klik X, buka kembali, lalu periksa Bagikan dan Unduh tetap berfungsi serta dokumen tetap terlihat.
- Periksa kesalahan aplikasi setelah perubahan.