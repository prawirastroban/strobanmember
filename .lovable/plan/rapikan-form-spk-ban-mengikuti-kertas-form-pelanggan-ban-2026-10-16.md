# Rapikan form SPK Ban mengikuti kertas "Form Pelanggan Ban"

Hanya berlaku untuk SPK Ban (manual maupun hasil scan). SPK Service tidak berubah sama sekali.

## Tampilan baru (SPK Ban)

Bagian "Data Pelanggan" dan "Data Kendaraan" untuk SPK Ban diganti menjadi satu kartu **Form Pelanggan Ban** dengan susunan persis seperti kertas:

```text
                                         Tanggal: [__/__/____]
+------------------------------+------------------------------+
| Nama        *                | Merk/Tipe Mobil  *           |
| No. HP      *                | Tahun Mobil      *           |
| Alamat                       | Ukuran Ban                   |
| No Plat     *                | Merk Ban                     |
+------------------------------+------------------------------+
 Waktu Masuk   Waktu Mulai   Waktu Selesai   Waktu Jeda  Ket.
```

- Kolom kiri: Nama, No. HP, Alamat, No Plat. Kolom kanan: Merk/Tipe Mobil, Tahun Mobil, Ukuran Ban, Merk Ban. Di HP tersusun satu kolom dengan urutan yang sama.
- Tanggal di pojok kanan atas (otomatis hari ini, bisa diubah; terisi dari scan bila ada).
- Baris waktu: Waktu Masuk (otomatis jam sekarang), Mulai, Selesai, Jeda + Ket. (Mulai/Selesai tetap bisa diisi teknisi nanti).
- Dihapus untuk SPK Ban: Kilometer Sekarang, Kilometer Servis Berikutnya, kartu "Keluhan Pelanggan" (Keluhan, Estimasi, Waktu Konfirmasi) — tidak ada di kertas Ban dan tidak lagi wajib.
- Ukuran Ban & Merk Ban dipindah dari kartu "Data Ban" ke kartu ini, agar tidak ganda. Kartu "Data Ban" tetap berisi layanan, kondisi, mm, ban bekas, history, catatan, mekanik.
- Pilihan Sumber dan centang "Buatkan akun pelanggan" tetap ada, diletakkan kecil di bawah kartu.

## Hasil scan
Hasil scan SPK Ban mengisi kolom-kolom di atas pada posisi yang sama (termasuk Alamat, Tanggal, dan waktu bila tertulis).

## Pratinjau / PDF SPK Ban
Bagian atas PDF SPK Ban ikut menampilkan Alamat dan baris waktu sesuai kertas.

## Detail teknis
- `SPKNewForm.tsx`: render kartu `BanCustomerCard` baru bila `spkType === "ban"`, sembunyikan kartu Pelanggan/Kendaraan/Keluhan lama; validasi Zod khusus ban (mileage & complaint_note opsional, isi default aman saat simpan: complaint_note = catatan ban atau "SPK Ban").
- Merk/Tipe Mobil disimpan ke `vehicle_merk` + `vehicle_tipe` (dipisah kata pertama) agar daftar SPK tetap terbaca.
- Tambah `alamat`, `tanggal`, `waktu_masuk/mulai/selesai` di model `BanData` (`banForm.ts`, normalisasi kompatibel data lama); `BanFormFields` mode intake tidak lagi menampilkan ukuran/merk ban.
- Prefill scan (`ocrPrefill.ts`) & prompt `spk-ocr-scan` membaca Alamat dan waktu; `BanPrintSheet` menampilkan field baru.
- Tidak ada perubahan database.
