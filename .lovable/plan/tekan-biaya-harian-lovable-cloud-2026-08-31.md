# Tekan Biaya Harian Lovable Cloud

Tujuan: menurunkan pemakaian kredit harian backend supaya sedekat mungkin dengan jatah gratis 20 kredit/bulan, tanpa mengubah fungsi aplikasi yang sudah berjalan.

## Kondisi saat ini (hasil pemeriksaan)

- Backend hidup normal. Ukuran database 86 MB, disk terpakai 5%, memori 57%, koneksi 26 dari 60.
- Hanya ada **1 pekerjaan terjadwal**: `send-service-reminders-hourly`, berjalan **setiap jam** (24x sehari, 720x sebulan).
- Pemakaian AI sangat kecil: hanya **1 panggilan** dalam 7 hari terakhir, biaya 0,014 kredit. Bukan sumber pemborosan.
- Aplikasi membuka koneksi Realtime terus-menerus (sinkronisasi konten, presence/heartbeat staf) dan halaman pelacakan publik memuat ulang tiap 20 detik.

Kesimpulan: biaya harian datang dari **backend yang tidak pernah benar-benar diam**, bukan dari AI dan bukan dari ukuran instance (instance sudah jauh dari penuh).

## Yang akan dikerjakan

### 1. Jadwalkan ulang pengingat servis
Pengingat servis tidak butuh ketelitian per jam. Ubah dari setiap jam menjadi **2x sehari** (pagi dan sore waktu Jakarta). Pelanggan tetap menerima pengingat di hari yang sama; jumlah eksekusi turun dari 720 menjadi 60 per bulan.

Konsekuensi: pengingat bisa terkirim maksimal beberapa jam lebih lambat dari saat ini. Kalau Anda ingin tetap presisi, kita bisa pakai 4x sehari sebagai jalan tengah.

### 2. Kurangi lalu lintas Realtime yang tidak perlu
- Presence/heartbeat staf: hentikan pengiriman saat tab tidak aktif (browser di latar belakang) dan perpanjang jeda detaknya.
- Sinkronisasi konten realtime: satukan langganan agar satu koneksi menangani semua tabel konten, bukan beberapa koneksi paralel.
- Pelacakan booking publik: ubah polling 20 detik menjadi 60 detik dan berhenti total saat halaman tidak terlihat.

Tampilan dan alur untuk pengguna tidak berubah — hanya frekuensi permintaan ke server yang turun.

### 3. Rapikan permintaan berulang di halaman pelanggan
Audit sebelumnya menemukan banyak panggilan duplikat di beranda. Tambahkan cache singkat pada data yang jarang berubah (banner, kategori, layanan) agar satu kunjungan tidak memicu puluhan permintaan.

### 4. Pasang rem biaya
Aktifkan peringatan kredit di level workspace agar Anda mendapat notifikasi sebelum saldo menipis, bukan setelah layanan berhenti.

## Yang TIDAK diubah

- Ukuran instance tetap. Database masih sangat lapang, mengecilkannya tidak aman dan tidak memberi penghematan berarti.
- Fitur AI (chat asisten, analisis kesehatan mobil, OCR SPK) tetap aktif — biayanya dapat diabaikan.
- Tidak ada perubahan alur booking, SPK, pembayaran, atau notifikasi WhatsApp.

## Catatan penting

Bahkan setelah semua ini, **kredit tetap akan berkurang setiap hari** selama backend Lovable Cloud yang dipakai — ini sifat penagihannya (per jam instance berjalan). Langkah di atas menekan jumlahnya, bukan menghilangkannya. Satu-satunya cara membuat web sepenuhnya lepas dari kredit Lovable adalah memindahkan database/auth/storage ke akun Supabase milik Anda sendiri, dan itu pekerjaan terpisah yang bisa kita rencanakan setelah ini.

## Rincian teknis

1. `cron.schedule` untuk `send-service-reminders-hourly` diubah dari `0 * * * *` menjadi `0 1,9 * * *` UTC (08:00 dan 16:00 WIB), dijalankan lewat `run_sql` karena berisi URL fungsi dan kunci proyek.
2. `src/hooks/usePresenceHeartbeat.ts` — pasang penjaga `document.visibilityState` dan naikkan interval detak.
3. `src/contexts/ContentSyncContext.tsx` — gabungkan langganan `postgres_changes` ke dalam satu channel.
4. `src/pages/PublicBookingTracker.tsx` (dan tracker SPK publik) — interval 20s menjadi 60s plus jeda saat `document.hidden`.
5. Tambahkan `staleTime` pada query beranda (`useHomeBanners`, `useServiceCategories`, `useBookingServices`, `useActivePromos`) agar tidak refetch berulang dalam satu sesi.
6. Aturan peringatan kredit workspace disetel lewat pengaturan kredit, bukan lewat kode.
