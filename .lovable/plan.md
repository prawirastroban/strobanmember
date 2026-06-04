## Tujuan
Tambahkan ringkasan harga eksplisit di bagian **Layanan & Pembayaran** (dialog Rincian Booking) dan di **InvoiceView**, dengan baris **Potongan** yang selalu tampil (Rp 0 jika tidak ada diskon) plus baris **Total Harga** yang jelas.

## Perubahan

### 1. `src/components/admin/BookingsManager.tsx` (Section "Layanan & Pembayaran", ±line 1572–1621)
Struktur baris baru (urutan):
- Layanan — nama servis
- Harga Normal — `original_service_price` (atau `service_price + discount_amount`). Selalu tampil.
- Potongan — `− Rp {discount_amount}` warna emerald jika > 0; tampil `Rp 0` netral jika tidak ada diskon. Sertakan label/code/source diskon di sisi kanan bila ada.
- **Total Harga** — baris penekanan (font-semibold text-primary, sedikit border-top) = `service_price`.
- Status Bayar
- Metode

Logika tetap pakai field existing (`service_price`, `original_service_price`, `discount_amount`, `discount_label`, `discount_code`, `discount_source`); tidak ada perubahan data/SQL.

### 2. `src/pages/InvoiceView.tsx` (blok Total, ±line 230–260)
Pada panel total kanan-bawah:
- Selalu tampilkan baris **Subtotal** (`original_service_price ?? service_price`).
- Selalu tampilkan baris **Potongan** (`Rp 0` jika tidak ada diskon, `− Rp …` hijau jika ada — sertakan label/code bila tersedia).
- **Total** tetap besar di bawah (`invoice.amount`), diberi separator tipis di atas agar terasa sebagai grand total.

Items list di atas tidak diubah (sudah menampilkan diskon per-item bila ada).

## Yang TIDAK diubah
- Tidak menyentuh database, edge function, perhitungan harga, atau invoice generator.
- Tidak mengubah komponen lain (mobile card, history, dsb).
- Tidak mengubah `EditBookingDialog`.

## Verifikasi
- Buka booking tanpa diskon → muncul "Potongan: Rp 0", Total Harga = service_price.
- Buka booking dengan promo/referral/loyalty → muncul Harga Normal (coret), Potongan dengan label sumber, Total Harga ditekan.
- Print invoice → blok total menampilkan Subtotal, Potongan, Total dengan benar di kedua skenario.