# Batasi Akses /pricelist — Hanya Staf/Admin

## Latar Belakang
Halaman `/pricelist` saat ini publik (bisa dibuka siapa saja dari sidebar halaman utama). Permintaan: halaman **tidak boleh diakses oleh role konsumen** — hanya staf/admin.

## Perubahan

### 1. Proteksi route `/pricelist` (src/App.tsx)
- Bungkus elemen route `<Pricelist />` dengan komponen `<AdminRoute>` yang sudah ada (dipakai semua halaman dashboard):
  - Konsumen yang login → dialihkan kembali ke beranda.
  - Pengunjung yang belum login → diarahkan ke halaman masuk (`/auth`).
  - Staf/admin/admin cabang/mekanik → bisa mengakses.
- Tidak perlu komponen guard baru.

### 2. Sembunyikan menu Pricelist dari konsumen
Agar konsumen tidak menemukan tautan yang berujung redirect:
- **DesktopSidebar** (`src/components/DesktopSidebar.tsx`): pindahkan item "Pricelist" keluar dari `browseItems` statis; tampilkan sebagai item terpisah hanya ketika `isAdminOrStaff` (sudah tersedia di komponen ini), ditempatkan tepat di bawah item Katalog Layanan.
- **MobileNav** (`src/components/MobileNav.tsx`): bungkus tombol "Pricelist" di menu pengguna dengan syarat `!roleLoading && isAdminOrStaff` (kedua nilai sudah tersedia). Menu guest tidak menampilkan Pricelist.

### 3. Verifikasi
- Build bersih (`tsgo`).
- Playwright:
  - Staf login → menu Pricelist terlihat di sidebar, halaman `/pricelist` terbuka.
  - Konsumen (role user) → menu tidak tampil, dan akses langsung URL `/pricelist` dialihkan ke beranda.

## Catatan
- Tidak ada perubahan pada halaman Pricelist itu sendiri maupun data lain.
- Ketika sistem pricelist untuk konsumen dibuat nanti, proteksi ini tinggal dilepas secara sadar.
