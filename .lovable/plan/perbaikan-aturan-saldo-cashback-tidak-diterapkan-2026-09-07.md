# Perbaikan: Aturan Saldo Cashback Tidak Diterapkan

## Apa yang terjadi (sudah diperiksa)

1. **Pelanggan tidak bisa membaca aturannya.** Aturan disimpan di pengaturan aplikasi, tetapi izin baca hanya diberikan ke admin/staff (dan beberapa kunci publik seperti versi aplikasi & banner). Saat aplikasi pelanggan membacanya, hasilnya kosong sehingga sistem memakai **aturan bawaan yang serba boleh** (aktif, semua layanan, tanpa batas). Inilah sebab utama pelanggan masih bisa memakai saldo di luar aturan.
2. **Potongan sudah dipakai sebelum divalidasi server.** Saat pesanan dibuat, harga langsung dikurangi saldo cashback. Pengecekan aturan di server baru berjalan sesudahnya; kalau ditolak, sistem hanya menampilkan peringatan kecil, sementara harga pesanan tetap terpotong (dan saldo tidak berkurang) — pelanggan tetap dapat potongan.
3. **Efek samping dari poin 2:** server menghitung "minimal transaksi" dan "maksimal persen" dari harga yang sudah dipotong, bukan dari total tagihan sebenarnya.
4. **Aturan "layanan tertentu" longgar.** Cukup satu layanan yang diizinkan ada di keranjang, seluruh keranjang (termasuk layanan/barang yang tidak diizinkan) ikut boleh dipotong saldo.

Aturan yang aktif sekarang: hanya layanan tertentu, minimal transaksi Rp 250.000, maksimal potongan Rp 150.000, barang dikecualikan.

## Yang akan diperbaiki

- Aturan cashback bisa dibaca semua pelanggan (read-only), sehingga kartu "Saldo Cashback" di checkout benar-benar mengikuti setelan Owner.
- Bila aturan gagal dibaca, sistem memilih sikap aman: saldo tidak bisa dipakai (bukan malah bebas dipakai).
- Harga pesanan tidak lagi dipotong lebih dulu. Potongan hanya diterapkan setelah server menyetujui; jika ditolak, pesanan tetap dibuat dengan harga penuh dan pelanggan mendapat pesan jelas ("Saldo tidak bisa dipakai untuk layanan ini", "Minimal transaksi Rp 250.000", dst).
- Server menghitung batas dari total tagihan sebenarnya.
- Mode "layanan tertentu"/"kategori tertentu" diperketat: saldo hanya boleh dipakai bila **semua** item di keranjang termasuk yang diizinkan, dan langsung ditolak bila ada barang saat opsi "kecualikan barang" aktif.
- Perubahan aturan oleh Owner langsung berlaku di aplikasi (tanpa menunggu cache lama).

## Detail teknis

Backend (satu migrasi)
- Tambah policy baca pada `app_settings` untuk key `cashback.usage_rules` bagi role `authenticated` (pola sama dengan key publik yang sudah ada).
- Perbarui RPC `apply_cashback_to_booking`:
  - hitung `v_total` dari `original_service_price`/`service_price + pickup_fee + pickup_return_fee - discount_amount` **tanpa** mengurangi cashback (nilai basis dikirim eksplisit dari client sebagai parameter opsional `_gross_total` dan divalidasi terhadap kolom booking, ambil yang terbesar konsisten);
  - mode `services`/`categories` memakai semantik "semua item harus memenuhi" (`NOT EXISTS` item di luar daftar) bukan "ada satu yang cocok";
  - `exclude_products` dicek lebih dulu, terlepas dari mode;
  - saat sukses, RPC sendiri yang menurunkan `service_price` sebesar jumlah cashback (sumber kebenaran tunggal).

Frontend
- `src/lib/cashbackRules.ts`: `fetchCashbackRules` mengembalikan status gagal-baca; tambahkan `DENIED_FALLBACK` (enabled=false) agar UI menutup opsi saat data tak terbaca. `evaluateCashbackUsage` diubah ke semantik "semua item" agar cermin persis logika server; kurangi TTL cache ke 15 detik + `invalidateCashbackRules()` dipanggil saat Owner menyimpan aturan.
- `src/pages/Booking.tsx` & `src/components/booking/MobileBookingWizard.tsx`: `service_price` saat insert **tidak** dikurangi `cashbackToUse`; panggil RPC setelah insert dan biarkan RPC yang memotong; tampilkan pesan error yang ramah per kode (`service_not_eligible`, `below_min_transaction`, `exceeds_max`, `cashback_disabled`) lalu refresh ringkasan harga.
- `src/components/admin/CashbackRulesManager.tsx`: invalidasi cache setelah simpan.

## Verifikasi

Uji tiga skenario di preview: layanan tidak diizinkan (kartu tersembunyi + RPC menolak), total di bawah Rp 250.000 (pesan kurang), dan potongan di atas Rp 150.000 (dibatasi otomatis) — sambil memastikan harga akhir pesanan sesuai hasil server.
