## Tujuan

Membuat data SPK nyata untuk akun uji Anda supaya fitur **Analisis Kesehatan AI** kembali tampil di Riwayat Perawatan, Pengingat Servis, Kendaraan Saya, dan Detail Kendaraan — setelah filter baru (hanya SPK aktif & berstatus selesai) membuat kartu AI kosong.

## Temuan dari database

- Akun yang sedang Anda pakai di preview adalah `prawira.stroban@gmail.com` (nama profil tersimpan: **"Ganteng"**), pemilik dua kendaraan yang terlihat di aplikasi: **BMW M3 Touring — Z 4 MAL** dan **Mercedes G 63 — B 4 GUS**.
- Ada juga profil terpisah bernama "Prawira Zamal Mustofa" dengan kendaraan BMW E30, tapi itu bukan akun yang Anda pakai login.
- Akun ini saat ini tidak punya SPK aktif berstatus selesai, karena SPK lamanya sudah dihapus.

Rencana ini memakai akun login Anda (pemilik M3 Touring & G 63).

## Langkah

1. **Buat 2 SPK selesai (data pengerjaan lengkap)**
   Satu SPK per kendaraan, ditulis langsung ke tabel SPK dengan:
   - `customer_id` = akun Anda, `vehicle_id` = kendaraan terkait, nomor SPK baru, status **selesai (closed)**, waktu buka/tutup wajar.
   - Isi `data` realistis seperti hasil kerja mekanik: keluhan pelanggan, kilometer, hasil checklist Safety Check & General Check Up (campuran `ok` / `not ok` / `n/a`), catatan mekanik, dan beberapa baris estimasi.
   - BMW M3 Touring: kondisi ringan (rem & oli baik, filter udara kotor) → diperkirakan "Baik".
   - Mercedes G 63: beberapa temuan (shock absorber lemah, ban belakang tipis, brake fluid kotor) → diperkirakan "Perlu Perhatian".
   - Menambahkan beberapa entri timeline agar halaman live tracking SPK terlihat wajar saat tombol **Lihat SPK** diklik.

2. **Jalankan analisis AI**
   Memanggil fungsi `spk-health-analysis` untuk masing-masing SPK sehingga `ai_health_report` terisi hasil AI sungguhan (skor, ringkasan, temuan, rekomendasi), bukan data tiruan.

3. **Verifikasi lewat browser dengan sesi login Anda**
   - Kendaraan Saya → badge AI muncul pada kedua kartu kendaraan.
   - Detail Kendaraan (M3 Touring & G 63) → panel Analisis Kesehatan AI tampil.
   - Riwayat Perawatan & Pengingat Servis → blok Kesehatan Kendaraan (AI) tampil.
   - Klik **Lihat SPK** → halaman live tracking terbuka normal (bukan "Data Servis Tidak Tersedia").
   Bukti berupa screenshot tampilan mobile.

## Catatan teknis

- Hanya penambahan baris data (SPK + timeline) melalui alat data Supabase; tidak ada perubahan skema, RLS, atau logika aplikasi.
- SPK ini adalah data uji yang bisa dihapus kapan saja dari daftar SPK jika sudah tidak dibutuhkan.
