## Masalah
Saat sidebar dalam mode collapsed (ciut), badge notifikasi merah pada icon menu (mis. Dashboard, Konfirmasi, Marketing) terpotong di sisi kanan/atas karena container `SidebarMenuButton` memiliki `overflow-hidden` bawaan, sedangkan badge diposisikan `absolute -top-1.5 -right-1.5` keluar dari batas icon.

## Solusi
Pada `src/components/admin/AdminSidebar.tsx`, tambahkan `overflow-visible` ke `SidebarMenuButton` (dan `CollapsibleTrigger` button) saat mode collapsed, sehingga badge merah bisa tampil penuh tidak terpotong.

### Perubahan
1. Tambah `overflow-visible` pada className `SidebarMenuButton` di `renderCollapsible` (baris ~155).
2. Tambah `overflow-visible` pada className `SidebarMenuButton` di `renderItem` (baris ~234).
3. Pastikan wrapper `<span className="relative">` icon tidak terpotong (sudah `relative`, tinggal pastikan parent tidak clip).

Hasil: badge merah tampil utuh di pojok kanan-atas icon saat sidebar diciut.
