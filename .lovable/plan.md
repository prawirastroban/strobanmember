Menghilangkan animasi kedip (animate-pulse) pada badge notifikasi merah agar dot dan angka tetap terlihat stabil.

Perubahan:
1. `src/components/admin/DashboardMenuGrid.tsx` — hapus class `animate-pulse` dari elemen badge merah di ujung kanan atas tile.
2. `src/components/admin/AdminSidebar.tsx` — hapus class `animate-pulse` dari elemen badge merah pada menu sidebar.

Tidak ada perubahan logika, data, atau perilaku lainnya.