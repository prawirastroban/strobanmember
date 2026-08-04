# Kartu Kendaraan di Form Keluhan + Petunjuk Geser

## 1. Data Kendaraan (form keluhan di beranda)

Pengguna yang sudah punya kendaraan terdaftar saat ini hanya melihat chip teks kecil. Diganti kartu kendaraan seperti mockup.

- **Jika ada kendaraan tersimpan**: deretan kartu yang bisa digeser, tiap kartu berisi foto mobil, badge "Utama" untuk kendaraan default, nama + tahun, plat nomor, dan baris info bawah: badge "AI Baik · skor" (bila ada laporan AI), transmisi • bahan bakar • ukuran ban.
- Kartu terpilih diberi ring merah; datanya otomatis mengisi form (merk, tipe, tahun, transmisi, plat) dan form dikunci seperti sekarang.
- Kartu terakhir: "+ Kendaraan lain" untuk mode manual — form kembali kosong dan bisa diedit.
- **Jika belum ada kendaraan tersimpan** (atau belum login): tampilan tetap seperti sekarang, langsung form isian manual.
- Saat kartu tersimpan dipilih, field detail diringkas (disembunyikan) dengan tautan kecil "Ubah data", supaya tidak penuh field terkunci.

## 2. Tanda panah untuk area yang bisa digeser

- Deretan kartu kendaraan dibungkus komponen `ScrollHintRow` yang sudah ada: panah kiri/kanan + gradasi fade muncul otomatis hanya saat konten masih bisa digeser, dan bisa diklik untuk menggeser.
- Diterapkan juga ke area geser horizontal utama yang dilihat pelanggan:
  - `HeroBookingForm.tsx` (baris chip)
  - `PromoCarousel.tsx`
  - `MobileBranchPicker.tsx`
  - `MobileHero.tsx`
  - `ServiceCatalog.tsx` / `Katalog.tsx` (baris kategori)
  - `TireCatalogSection.tsx`
  - `MobileBookingWizard.tsx`
- Panel admin/dashboard (tabel lebar) belum diubah agar perubahan tetap terkendali; bisa menyusul bila diinginkan.

## 3. Petunjuk geser vertikal

- Tambah varian `ScrollHintColumn` (panah atas/bawah + fade) dan pasang pada area scroll vertikal di dalam kartu, mis. daftar chat hasil konsultasi AI di form keluhan.

## Catatan teknis

- Komponen baru `src/components/vehicle/SavedVehicleCard.tsx`; sumber data tetap query `vehicles` yang sudah ada di `PopularServices.tsx`, ditambah kolom `image_url`, `fuel_type`, `tire_size`.
- Skor AI diambil dari hook `useVehicleHealthReports` + `VehicleAIHealthBadge` yang sudah dipakai di `/my-vehicles`.
- `src/components/ui/scroll-hint-row.tsx` diperluas dengan ekspor `ScrollHintColumn`. Tidak ada perubahan logika bisnis, database, atau alur konsultasi AI.