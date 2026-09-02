# Pengaturan Global Pemakaian Saldo Cashback

Admin (Owner) dapat menentukan secara global di layanan mana saja saldo cashback pelanggan boleh dipakai, plus batas pemakaiannya. Aturan berlaku untuk semua checkout (web, mobile wizard) dan divalidasi juga di sisi server sehingga tidak bisa diakali dari aplikasi.

## Aturan yang bisa diatur

- Aktif/nonaktif pemakaian saldo cashback secara global.
- Mode berlaku:
  - Semua layanan (default sekarang), atau
  - Hanya kategori tertentu (pilih dari daftar kategori layanan), atau
  - Hanya layanan tertentu (pilih layanan spesifik; jika diisi, pilihan kategori diabaikan — sama seperti aturan promo yang sudah ada).
- Batas pemakaian: minimal transaksi (Rp), maksimal potongan per transaksi (Rp), dan maksimal persentase dari total tagihan (%).
- Opsi kecualikan kategori barang (ban/oli/sparepart) dengan satu klik.
- Teks bantuan yang tampil ke pelanggan bila saldo tidak bisa dipakai (opsional, default sudah disediakan).

## Pengalaman pelanggan

- Di checkout, kartu "Saldo Cashback" hanya muncul bila layanan yang dipilih memenuhi aturan; jika tidak, muncul catatan singkat, misalnya "Saldo cashback hanya berlaku untuk layanan servis tertentu".
- Bila total belum mencapai minimal transaksi, ditampilkan kekurangannya (mis. "Kurang Rp 50.000 lagi").
- Nilai maksimum yang bisa dipakai otomatis mengikuti batas Rp/persentase.
- Bila pelanggan mengubah layanan sehingga jadi tidak memenuhi syarat, saldo yang sudah dipilih dilepas otomatis.

## Lokasi menu admin

Panel baru "Aturan Saldo Cashback" di dashboard bagian Marketing/Loyalitas (satu halaman dengan pengelolaan promo & poin), hanya untuk Owner.

## Detail teknis

Backend
- Simpan konfigurasi sebagai satu baris JSON di `app_settings` dengan key `cashback.usage_rules` (pola yang sama dipakai `spk.*`, pickup settings, dll.) — tidak ada tabel baru.
  ```json
  {
    "enabled": true,
    "mode": "all | categories | services",
    "allowed_categories": ["..."],
    "allowed_service_ids": ["uuid"],
    "exclude_products": false,
    "min_transaction": 0,
    "max_amount": 0,
    "max_percent": 100,
    "denied_message": "..."
  }
  ```
- Migrasi: tambahkan kolom `bookings.service_ids text[]` (default `'{}'`) supaya validasi server tahu layanan apa yang dipesan; sekarang booking hanya menyimpan `service_name`/`service_type` gabungan.
- Perbarui RPC `apply_cashback_to_booking` (SECURITY DEFINER) agar membaca `cashback.usage_rules`, mencocokkan `bookings.service_ids`/kategori layanan, lalu menolak dengan kode error jelas (`cashback_disabled`, `service_not_eligible`, `below_min_transaction`, `exceeds_max`) dan memotong jumlah sesuai batas.
- Read akses `app_settings` untuk key ini sudah ada (dibaca publik/authenticated); tulis tetap terbatas ke Owner/staff sesuai policy yang berlaku.

Frontend
- `src/lib/cashbackRules.ts` baru: tipe konfigurasi, loader (cache pendek), dan fungsi murni `evaluateCashbackUsage({ rules, services, total })` → `{ eligible, reason, maxUsable }`. Satu sumber kebenaran untuk kedua checkout.
- `src/components/booking/CashbackUsageInput.tsx`: terima daftar layanan terpilih + total, pakai hasil evaluasi untuk menampilkan/menyembunyikan kartu, batas maksimum, dan pesan alasan.
- `src/pages/Booking.tsx` dan `src/components/booking/MobileBookingWizard.tsx`: kirim layanan terpilih ke komponen, reset `cashbackToUse` saat aturan tidak lagi terpenuhi, dan isi `service_ids` saat insert booking.
- `src/components/admin/CashbackRulesManager.tsx` baru: form pengaturan memakai `ServiceMultiPicker` (sudah ada) untuk pilih layanan, checkbox kategori, input Rp/persen, tombol simpan ke `app_settings`, plus pratinjau ringkas aturan aktif. Didaftarkan di menu dashboard + `pageRegistry`.

Catatan: aturan ini hanya mengatur *pemakaian* saldo, bukan cara saldo diperoleh (promo `reward_mode = cashback` tetap seperti sekarang).
