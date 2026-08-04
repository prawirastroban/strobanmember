# Pakai Data Kendaraan Tersimpan di Form Keluhan

Saat ini form "Data Kendaraan" di panel keluhan (beranda) selalu harus diisi manual. Untuk pengguna yang sudah login dan sudah punya kendaraan terdaftar, kita tambahkan opsi memilih kendaraan tersimpan.

## Yang akan dibuat

1. **Pemilih kendaraan (chip)** di bagian atas kartu Data Kendaraan, hanya tampil kalau user login dan punya minimal 1 kendaraan terdaftar:
   - Deretan chip: `Avanza • B 1234 XX`, `Brio • B 5678 YY`, ... plus chip terakhir `+ Kendaraan lain` untuk isi manual.
   - Kendaraan default (is_default) terpilih otomatis saat panel pertama kali dibuka, kecuali user sudah punya isian draft sebelumnya.
2. **Auto-isi field** saat sebuah kendaraan dipilih: merk, tipe (pakai "Lainnya / tulis sendiri" bila tipe tidak ada di katalog), tahun, transmisi, plat nomor, dan kilometer bila tersedia. Field jadi terkunci (read-only) selama kendaraan tersimpan terpilih; user tetap bisa mengubah kilometer.
3. **Mode manual** saat memilih `+ Kendaraan lain`: field kembali kosong dan bisa diedit seperti sekarang.
4. Draft lokal tetap berfungsi seperti sekarang (tidak hilang saat pindah halaman); pilihan kendaraan ikut disimpan.

## Yang tidak berubah

- Alur konsultasi AI, payload ke edge function, rekomendasi layanan, dan tombol booking tetap sama.
- Tampilan untuk tamu (belum login) tidak berubah sama sekali.

## Catatan teknis

- File: `src/components/mobile/home/PopularServices.tsx`.
- Ambil data dari tabel `vehicles` (`brand, model, year, transmission, license_plate, mileage, is_default`) dengan filter `user_id = user.id`, dipanggil sekali saat komponen mount dan user tersedia.
- Simpan `selectedVehicleId` di state + ikut ditulis ke `stroban.komplain.vehicle` di localStorage.
- Mapping tipe: kalau `model` tidak ada di `BRAND_MODELS[brand]`, set `vModel = "Lainnya"` dan `vCustomModel = model`.
