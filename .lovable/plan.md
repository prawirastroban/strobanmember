## Tujuan

Mengubah blok **Quick Access** di dashboard agar otomatis menampilkan menu yang **paling sering dipakai** oleh user, diurutkan dari yang paling sering. Tidak lagi 5 tile hard-coded.

## Perilaku

1. Setiap kali user mengklik menu di sidebar / tile Quick Access / NeedAttention, sistem mencatat 1 hit untuk `url` tersebut.
2. Quick Access menampilkan **5 menu** dengan hit terbanyak, urut menurun.
3. Hanya menu yang **lolos role** user dan masih ada di `dashboardMenu` (parent atau child leaf) yang dihitung & ditampilkan — entry stale otomatis di-skip.
4. Jika user baru (belum ada data), tampilkan default seed: `Booking → Customer → CRM → Laporan → Keuangan` (sama seperti sekarang) — supaya tile tidak pernah kosong.
5. Saat data parsial (misal baru 2 menu pernah diklik), 3 sisanya diisi dari default seed (tanpa duplikat).
6. Judul section diganti dari "Quick Access" → "Quick Access · Sering Dipakai" untuk transparansi.

## Penyimpanan

- `localStorage` key: `dashboard:menuUsage:v1`
- Struktur: `Record<url, { count: number; lastUsed: number }>`
- Per-user (dibedakan dengan suffix `auth.user.id` bila ada) supaya tidak bocor antar akun di device shared.
- **Decay opsional (ringan)**: setiap kali tulis, jika `lastUsed` > 60 hari, decay count ke `floor(count/2)` agar menu lama tidak mendominasi selamanya.
- Tidak menyentuh DB / RLS / edge function.

## Perubahan Kode

1. **Baru** `src/hooks/useMenuUsage.ts`
   - `trackMenuClick(url: string)` — increment hit, update `lastUsed`, tulis ke localStorage.
   - `useTopMenus(limit = 5, flags)` — baca usage, filter via `findMenuByUrl` + `passesRole`, sort desc by count, top-N, lalu pad dengan default seed sampai `limit`.
   - Listen `storage` event supaya update lintas tab.

2. **Edit** `src/components/admin/DashboardHomeBlocks.tsx`
   - `QuickAccessGrid` pakai `useTopMenus(5, flags)` bukan `QUICK_ACCESS_URLS` statis.
   - Setiap klik tile panggil `trackMenuClick(url)` sebelum `navigate`.
   - Title ringkas: "Quick Access · Sering Dipakai".

3. **Edit** `src/components/admin/AdminSidebar.tsx`
   - Tambah `onClick={() => trackMenuClick(item.url)}` di setiap `SidebarMenuButton` (parent & child) supaya aktivitas sidebar juga ikut tercatat. Tidak mengubah routing / role check.

4. **Edit** `src/components/admin/DashboardHomeBlocks.tsx` → `NeedAttention`
   - Tombol "Lihat" juga panggil `trackMenuClick` sebelum `navigate`.

## Yang TIDAK Diubah

- Tidak menghapus / mengubah route, DB, RLS, edge function, role, atau business logic.
- Struktur `dashboardMenu`, kategori, dan auto-inference tetap.
- Sidebar grouping & ordering tetap.
- `findMenuByUrl`, `getOverviewTiles`, `getSidebarSections` tetap (hanya dikonsumsi).

## Edge Cases

- localStorage disabled / quota → fallback in-memory map, Quick Access tetap render default seed.
- URL menu yang dulu pernah dipakai lalu dihapus dari `dashboardMenu` → otomatis dilewati (`findMenuByUrl` returns `undefined`).
- Role berubah (misal staff jadi non-staff) → menu yang gagal `passesRole` di-skip otomatis.
- SSR-safe guard (`typeof window !== "undefined"`).

## Verifikasi

- Klik beberapa kali ke menu yang berbeda → reload `/dashboard` → urutan tile berubah sesuai frekuensi.
- Hapus localStorage → Quick Access kembali ke default seed.
- Login akun lain di tab yang sama → usage tidak ikut bercampur (di-scope per user id).
