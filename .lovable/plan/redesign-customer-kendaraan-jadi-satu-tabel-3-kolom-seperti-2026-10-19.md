# Redesign Customer + Kendaraan jadi satu tabel 3 kolom (seperti foto)

Hanya tampilan halaman pengerjaan SPK Service. Data, isian wajib, validasi, dan auto-save tetap sama.

## Tampilan baru
Satu kotak bergaris tipis, 3 kolom x 3 baris, setiap sel berisi "Label :" lalu isian langsung di sebelahnya (tanpa kotak input tebal):

```text
| Customer :       | Brand :       | Waktu Estimasi :   |
| License Plate :  | Type/Model :  | Waktu Konfirmasi : |
| Phone :          | Years :       |                    |
```

- Kolom 1: Nama customer, No. Polisi, No. HP.
- Kolom 2: Merk, Tipe, Tahun.
- Kolom 3: Waktu Estimasi dan Waktu Konfirmasi (dipindah dari kartu Keluhan; di kartu Keluhan tidak tampil lagi agar tidak dobel).
- Di bawah tabel: baris kecil Mileage Now / Mileage Next dan pilihan Platform (Iklan/Organik), karena tidak ada di foto tapi tetap dibutuhkan.
- Tanda wajib (*) dan pesan error tetap muncul di sel terkait.
- HP: tabel jadi 1 kolom, tiap baris "Label : isian".

## Technical
- Ganti isi `CustomerCard` dengan tabel gabungan (pakai binding yang sama: customer_*, vehicle_*, complaint_estimasi/konfirmasi); `VehicleCard` tidak lagi dirender di SPKCanvas Service; field estimasi/konfirmasi disembunyikan di `ComplaintCard`.
- Section id `sec-customer` dan `sec-vehicle` tetap terdaftar agar navigasi/field wajib tetap jalan.
- SPK Ban tidak disentuh. Verifikasi Playwright desktop + HP.
