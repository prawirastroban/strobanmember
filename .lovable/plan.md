# Perbaiki Badge Notifikasi Sidebar (Collapsed Mode)

## Masalah
Saat sidebar di-collapse (mode icon), badge merah notifikasi pada item menu (Keluhan Kendaraan, Confirmation Bookings, dll.) **terpotong di sisi kanan & atas** karena posisinya (`-top-1.5 -right-1.5`) keluar dari bounding box tombol kecil, dan container parent memotongnya dengan `overflow-hidden` bawaan shadcn sidebar.

## Solusi
Hanya perubahan presentasi di `src/components/admin/AdminSidebar.tsx`:

1. **Reposisi badge agar tetap di dalam tombol** saat collapsed:
   - Ubah `absolute -top-1.5 -right-1.5` → `absolute -top-1 -right-2`
   - Perkecil ukuran badge: `h-4 w-4` → `h-[14px] min-w-[14px] px-[3px]`
   - Tambahkan `ring-2 ring-background` agar badge berbentuk bulat utuh dengan kontras yang baik (mirip card Quick Access pada screenshot).

2. **Pastikan tidak ter-clip** dengan menambahkan `overflow-visible` pada chain:
   - `SidebarMenu` & `SidebarMenuItem` di group menu (tambahkan className `!overflow-visible`).
   - Sudah ada `!overflow-visible` pada `SidebarMenuButton` dan `SidebarContent`, perluas ke `SidebarGroup` / `SidebarGroupContent` untuk mode collapsed.

3. **Tampilkan angka penuh** (tanpa "9+") konsisten dengan aturan baru — ganti `{badgeCount > 9 ? "9+" : badgeCount}` → `{badgeCount}` di mode collapsed, mengikuti perilaku NotificationBell.

4. **Samakan warna** dengan merah Stroban — gunakan token yang sama dengan tombol "Create Booking" (`bg-primary` atau `bg-[#ff2b2b]` sesuai design memory) agar konsisten di seluruh badge.

## File yang diubah
- `src/components/admin/AdminSidebar.tsx` (hanya className & posisi badge — tidak ada perubahan logic)

## Catatan
Perubahan murni visual/CSS. Tidak menyentuh data, hook, atau menu config.
