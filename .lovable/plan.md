# Pricelist: Filter & Search Sticky + Akses Import Owner/Staff

## Tujuan
1. Panel filter (kanan, desktop) tetap diam di tempatnya saat halaman di-scroll ke bawah.
2. Search bar tetap terlihat (freeze) di atas saat daftar ban di-scroll.
3. Tombol Import Excel hanya untuk Owner dan Staff (CS Pusat) — Admin Cabang, Mekanik, dan Konsumen tidak melihatnya.

## Temuan saat ini
- Filter sidebar desktop sudah memakai `sticky top-24` (src/pages/Pricelist.tsx baris 198), tetapi posisinya bisa ikut tergeser karena induknya ikut tinggi konten — perlu dipastikan benar-benar freeze dengan batas tinggi dan offset yang konsisten terhadap Navbar.
- Search bar (baris 131-142) ikut terscroll bersama sapaan — belum sticky.
- Akses import saat ini `canImport = isStaff || isAdmin` — di sistem ini role `staff` = Owner dan `admin` = CS Pusat/Staff, jadi secara logika sudah sesuai permintaan (Owner + Staff). Yang perlu dipastikan: role lain (admin_cabang, mekanik, customer) memang tidak melihat tombol, dan sisi server (RPC `replace_pricelist`) juga menolak role selain staff/admin.

## Perubahan

### 1. Search bar sticky (src/pages/Pricelist.tsx)
- Pisahkan baris search dari blok sapaan: sapaan tetap di atas mengikuti scroll, sedangkan bar search + tombol filter (mobile) dibungkus container `sticky top-[72px] z-30` dengan latar blur (`bg-background/80 backdrop-blur-xl`) dan padding agar tidak transparan saat menimpa kartu.
- Offset `top` disesuaikan dengan tinggi Navbar agar tidak tertutup.

### 2. Filter sidebar benar-benar freeze (src/pages/Pricelist.tsx)
- Samakan offset sticky sidebar dengan search bar (`top` konsisten), pertahankan `max-h-[calc(100vh-…)] overflow-auto` agar daftar filter panjang (Pattern) bisa di-scroll di dalam panel sementara panelnya sendiri diam.
- Verifikasi visual dengan scroll panjang: sidebar tidak bergerak.

### 3. Akses Import Excel = Owner + Staff saja
- Pertahankan `canImport = isStaff || isAdmin` (Owner + CS/Staff), pastikan admin_cabang & mekanik tidak melihat tombol.
- Cek guard di RPC `replace_pricelist` (supabase--read_query pada definisi fungsi); jika belum membatasi ke `has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin')`, tambahkan lewat migrasi agar penolakan juga berlaku di server, bukan hanya menyembunyikan tombol.

## Verifikasi
- Playwright: login sebagai Owner → scroll halaman panjang, screenshot: search bar & filter tetap terlihat; tombol Import tampil.
- Login sebagai akun admin_cabang/mekanik (jika tersedia) → tombol Import tidak tampil.
- `npx tsgo --noEmit -p tsconfig.app.json` bersih.

## Teknis
- Hanya menyentuh `src/pages/Pricelist.tsx` (+ kemungkinan 1 migrasi kecil untuk guard RPC `replace_pricelist`).
- Tidak mengubah flow, data, atau logika pencarian/filter.
