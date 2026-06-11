## Tujuan
Tab bar dashboard (Dashboard, Web Analytics, Customer Management, dst.) tetap menempel di atas dan tidak ikut tergeser saat konten halaman di-scroll.

## Masalah saat ini
Di `AdminLayout.tsx`, area scroll ada di `<main>` (kelas `overflow-auto`). Tapi `DashboardTopbar` berada di luar `<main>`, di dalam kolom flex yang juga ikut menyusut. Saat halaman pendek viewport-nya, browser tetap men-scroll wrapper terluar dan topbar bisa hilang dari pandangan (terutama di layar pendek / mobile).

## Perubahan

### 1. `src/components/admin/AdminLayout.tsx`
- Pastikan kolom kanan (yang berisi `DashboardTopbar` + `main`) punya `h-[calc(100vh-4rem)]` agar scroll benar-benar terjadi di dalam `<main>`, bukan di window.
- Tambahkan `sticky top-0 z-30` pada `DashboardTopbar` sebagai lapisan kedua perlindungan.

### 2. `src/components/admin/DashboardTopbar.tsx`
- Tambah kelas `sticky top-0 z-30` pada container terluar topbar (selain `shrink-0` yang sudah ada), supaya kalaupun ada konteks scroll lain, baris tab tetap menempel.
- Pertahankan `backdrop-blur-md` dan background semi-transparan yang sudah ada agar terlihat clean saat konten lewat di belakangnya.

### 3. Header `Navbar` (tidak diubah)
Navbar utama sudah fixed/own layout — tidak disentuh agar tidak mengubah perilaku halaman lain.

## Tidak diubah
- Konten setiap halaman dashboard.
- Sidebar (sudah `top-16 h-[calc(100vh-4rem)]`).
- Logika tab (`DashboardTabsContext`).

## Hasil yang diharapkan
Saat scroll di halaman dashboard manapun (mis. `/dashboard/analytics`), baris tab tetap terlihat di atas, hanya konten `<main>` yang bergerak.
