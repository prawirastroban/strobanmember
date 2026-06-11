## Masalah

Saat ini `DashboardTopbar` (baris tab + toggle sidebar) di `AdminLayout` sudah punya `sticky top-0 z-30` dan berada di luar `<main>`. Tapi di sebagian route tab bar masih ikut ter-scroll karena **window-nya** yang scroll (bukan `<main>`):

- Root `AdminLayout` pakai `min-h-screen flex flex-col` — kalau ada child yang tinggi atau pakai `min-h-screen` sendiri, root bisa melar dan **window** (bukan `<main>`) yang scroll. Akibatnya `Navbar` + `DashboardTopbar` ikut menggulung ke atas.
- Tinggi kolom kanan `h-[calc(100vh-4rem)]` mengasumsikan `Navbar` selalu 4rem; di route tertentu / mobile, asumsi ini meleset → main tidak benar-benar jadi container scroll.

Solusi: pastikan **hanya `<main>` yang boleh scroll** di semua route admin, sehingga `Navbar` + tab `DashboardTopbar` selalu di tempat.

## Perubahan File

### 1. `src/components/admin/AdminLayout.tsx`

- Ganti root dari `min-h-screen flex flex-col` → `h-screen flex flex-col overflow-hidden`. Window tidak akan pernah scroll.
- Bungkus `Navbar` agar `shrink-0` (tidak ikut menyusut).
- Row sidebar+content: tetap `flex-1 flex w-full overflow-hidden` tapi tambah `min-h-0` supaya flex-child boleh menyusut.
- Kolom kanan: ganti `h-[calc(100vh-4rem)]` → `flex-1 min-h-0` (ikut sisa tinggi dari flex, tanpa asumsi tinggi Navbar).
- `<main>` tetap `flex-1 overflow-auto`.
- Tidak ubah konten/route.

### 2. `src/components/admin/DashboardTopbar.tsx`

- Sudah `sticky top-0 z-30 shrink-0` — biarkan apa adanya (jaring pengaman jika ada container scroll lain).
- Tidak ada perubahan logika tab; `DashboardTabsContext` tetap menjaga state tab antar-route.

### 3. (Opsional sanity check)

- Cari child page yang pakai `min-h-screen` di area dashboard yang bisa menyebabkan over-flow window. Bila ada, **tidak diubah dalam plan ini** — perbaikan layout induk sudah cukup karena `overflow-hidden` di root memutus rantai.

## Yang Tidak Diubah

- Navbar, AdminSidebar, semua page dashboard, dan state tab.
- Tidak ada perubahan styling visual selain pin behavior.

## Validasi

1. Buka `/dashboard`, scroll panjang → Navbar + tab bar tetap diam, hanya konten yang scroll.
2. Klik tab lain (Bookings, CRM, Financial Report, dst.) → tab bar tetap di posisi, scroll konten reset, Navbar tidak hilang.
3. Test mobile (390×844): sama, tidak ada double scroll.

Setuju lanjut implementasi?
