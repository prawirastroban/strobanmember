# Selaraskan Warna & Font Badge Notifikasi

Samakan badge merah di **NotificationBell** (header bell) & **DashboardHomeBlocks** (kartu Quick Access) dengan badge di sidebar `/dashboard`.

## Standar badge (dari AdminSidebar)
- Background: `bg-[hsl(0_95%_55%)]` (merah Stroban)
- Teks: `text-white font-bold leading-none`
- Ukuran teks: `text-[10px]` (atau `text-[9px]` untuk badge mini)
- Ring kontras: `ring-2 ring-background`
- Tampilkan angka penuh (tanpa "9+")

## Perubahan

**`src/components/NotificationBell.tsx`** (baris 136):
- `bg-destructive` → `bg-[hsl(0_95%_55%)]`
- `text-destructive-foreground` → `text-white`
- (sudah ada `font-bold leading-none ring-2 ring-background`)

**`src/components/admin/DashboardHomeBlocks.tsx`** (baris 41):
- `bg-destructive` → `bg-[hsl(0_95%_55%)]`
- `text-destructive-foreground` → `text-white`
- Tambahkan `leading-none`
- Hilangkan `9+` → tampilkan angka utuh: `{badge}`

Murni perubahan className/text — tidak ada logic baru.
