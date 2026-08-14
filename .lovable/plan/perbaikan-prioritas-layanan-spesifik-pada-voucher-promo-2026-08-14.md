# Perbaikan Prioritas Layanan Spesifik pada Voucher/Promo

## Masalah yang ditemukan (terverifikasi)

1. **Logika kelayakan voucher memakai OR.** Di `RedemptionCodeInput.tsx` fungsi `isVoucherEligible` mengembalikan `svcMatch || catMatch`. Jadi kalau sebuah promo diisi *layanan spesifik* sekaligus *kategori*, konsumen yang memilih layanan lain di kategori yang sama tetap lolos — persis bug yang dilaporkan.
2. **Logika berbeda di tempat lain.** `useActivePromos.ts` justru memakai AND (`idOk && catOk`), sehingga tampilan promo dan validasi voucher bisa memberi hasil berbeda untuk data yang sama.
3. **Form admin membingungkan.** Di `PromosManager.tsx` (dan `RewardsManager.tsx`) panel "Berlaku untuk Kategori Layanan" dan "Berlaku untuk Layanan Spesifik" bisa terisi bersamaan tanpa peringatan, sehingga data promo memang tersimpan ambigu.

## Aturan baru (satu sumber kebenaran)

- Jika **layanan spesifik terisi** → hanya layanan itu yang berlaku. Kategori diabaikan sepenuhnya.
- Jika layanan spesifik kosong → pakai filter kategori.
- Jika keduanya kosong → berlaku untuk semua layanan.

## Perubahan

**1. Form admin (Promos & Rewards)**
- Saat ada layanan spesifik yang dipilih, panel "Berlaku untuk Kategori Layanan" otomatis dinonaktifkan (redup, tidak bisa diklik) dengan catatan: "Dinonaktifkan karena layanan spesifik sudah dipilih."
- Saat disimpan, `applicable_categories` dikosongkan bila `applicable_service_ids` terisi, supaya data lama/baru selalu bersih.

**2. Sisi konsumen (booking/checkout)**
- `isVoucherEligible` diubah: bila daftar layanan spesifik tidak kosong, kelayakan **hanya** ditentukan oleh kecocokan ID layanan; kategori tidak lagi bisa "menyelamatkan" voucher.
- Voucher yang sudah terpasang tapi menjadi tidak layak setelah user mengganti layanan akan tetap dilepas otomatis (perilaku ini sudah ada, tinggal ikut aturan baru).
- Penilaian voucher terbaik (`scoreVoucher`) disesuaikan agar tidak memberi skor kategori pada promo yang sudah dibatasi per layanan.

**3. Konsistensi tampilan promo**
- `useActivePromos.ts` memakai aturan yang sama (layanan spesifik menang atas kategori), sehingga daftar promo yang tampil sama dengan yang benar-benar bisa dipakai.

## Catatan teknis

File yang disentuh: `src/components/booking/RedemptionCodeInput.tsx`, `src/hooks/useActivePromos.ts`, `src/components/admin/PromosManager.tsx`, `src/components/admin/RewardsManager.tsx`. Aturan kelayakan dipindah ke satu helper bersama (`src/lib/promoEligibility.ts`) agar tidak terjadi lagi perbedaan logika antar halaman. Tidak ada perubahan skema database; data promo lama yang terlanjur mengisi keduanya otomatis tunduk pada aturan "layanan spesifik menang".

Validasi saat ini masih di sisi klien. Kalau diinginkan, penguncian tambahan di sisi server (saat booking dibuat) bisa dikerjakan sebagai langkah lanjutan.
