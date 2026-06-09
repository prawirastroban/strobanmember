## Tambah badge notifikasi merah di tile menu Dashboard

Saat ini badge merah (jumlah item butuh aksi) hanya muncul di sidebar `AdminSidebar`. Tile menu di `DashboardMenuGrid` (Operasional / Marketing / Lainnya) belum punya badge tersebut.

### Yang akan diubah

**1. `src/hooks/useDashboardBadges.ts`** (baru)
- Pindahkan logika fetch count dari `AdminSidebar` ke hook reusable.
- Hook me-return objek: `{ pendingBookings, newComplaints, pendingPayments, unverifiedUsers, expiredPromos }` (+ realtime subscribe ke `bookings`, `vehicle_complaints`, `payments`, `profiles`, `promos`).
- Expose helper `badgeFor(url)` dengan mapping yang sama dengan sidebar, plus tambahan:
  - `/dashboard/marketing/promos` → expired/inactive promos
  - `/dashboard/keuangan/payment` & `/dashboard/keuangan` → pending payments
  - `/dashboard/marketing` → total badge marketing children
  - `/dashboard/reports` → 0 (tidak ada aksi langsung)

**2. `src/components/admin/AdminSidebar.tsx`**
- Refactor untuk pakai `useDashboardBadges()` (logika sama, tidak ada perubahan UI/RLS).

**3. `src/components/admin/DashboardMenuGrid.tsx`**
- Tambahkan badge merah absolute di pojok kanan-atas tiap tile yang punya count > 0.
- Style: `absolute top-2 right-2`, `h-5 min-w-[20px]`, bulat, `bg-destructive text-destructive-foreground`, `animate-pulse`, format `>9 → "9+"`.
- Hanya tampil kalau `badgeFor(tile.to) > 0`.

### Tidak diubah
- Routing, RLS, query data, role gating.
- Logika sidebar lainnya.
- Warna brand / token desain — pakai `bg-destructive` yang sudah ada.

### Verifikasi
- Buka `/dashboard`: tile "Confirmation Bookings", "Customers & Vehicles", "Keuangan", dll. yang punya pending muncul angka merah di pojok kanan-atas.
- Angka sinkron dengan badge di sidebar (realtime).
- Tile tanpa pending tidak menampilkan badge.