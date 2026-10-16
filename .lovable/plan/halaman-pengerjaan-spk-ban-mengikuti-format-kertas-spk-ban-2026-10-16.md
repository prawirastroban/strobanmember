# Halaman pengerjaan SPK Ban mengikuti format kertas SPK Ban

Hanya berlaku saat membuka SPK berjenis Ban. Halaman SPK Service tidak berubah.

## Yang berubah di halaman SPK Ban

Urutan baru:

```text
Header SPK (nomor, cabang, tanggal)
Form Pelanggan Ban        <- menggantikan Customer Information, Vehicle Information, Customer Complaint
  Tanggal (kanan atas)
  Nama          | Merk/Tipe Mobil
  No. HP        | Tahun Mobil
  Alamat        | Ukuran Ban
  No Plat       | Merk Ban
  Waktu Masuk / Mulai / Selesai / Jeda / Ket.
Foto SPK Asli
Pengerjaan Ban (Services, Sebelum/Sesudah, mm, Balancing, Rotasi, Ban Bekas, Catatan, History)
Finalisasi Pengerjaan
Analisis AI + Lihat/Cetak SPK
```

- Dihapus untuk SPK Ban: Platform, Mileage Now/Next, Customer Complaint (Catatan, Estimasi, Waktu Konfirmasi, Foto Bukti Keluhan) — tidak ada di kertas Ban.
- Ukuran Ban, Merk Ban, Waktu Jeda, dan Ket. Jeda tidak lagi tampil dua kali (cukup di Form Pelanggan Ban).
- Di Finalisasi, poin "Semua item Safety & General Check sudah dikerjakan" untuk SPK Ban diganti "Semua layanan ban sudah dikerjakan"; "Estimasi sparepart sudah dikonfirmasi" tidak ditampilkan untuk SPK Ban.
- Semua isian tetap tersimpan otomatis seperti sebelumnya, dan isi yang dibuat dari form "Buat SPK Ban" langsung muncul di sini.

## Detail teknis
- Komponen baru `BanCustomerCanvasCard` memakai `useBinding` untuk `customer_name`, `customer_phone`, `vehicle_plate`, `vehicle_merk`/`vehicle_tipe` (satu input Merk/Tipe, dipisah kata pertama), `vehicle_tahun`, dan objek `ban` (alamat, tanggal, ukuran_ban, merk_ban, waktu_*).
- `SPKCanvas.tsx`: bila `spk_type === "ban"`, render kartu ini menggantikan CustomerCard/VehicleCard/ComplaintCard.
- `BanFormFields` mendapat prop `hideIdentity` agar Ukuran/Merk Ban dan Waktu Jeda tidak tampil di kartu Pengerjaan Ban.
- `FinalizationCard` menerima `spkType` untuk mengganti teks checklist.
- Pastikan validasi isian wajib (mileage, keluhan) tidak memblokir penyelesaian SPK Ban.
