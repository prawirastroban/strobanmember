# Perbaikan: konten dashboard terpotong di bagian bawah

## Diagnosa
`AdminLayout` adalah satu-satunya wrapper untuk semua halaman `/dashboard/*`. Strukturnya pakai `h-[100dvh] overflow-hidden` + `<main flex-1 overflow-y-auto>` dengan padding bawah hanya:

```tsx
<main ...>
  <div className="p-3 md:p-5 pb-24 md:pb-12">{children}</div>
</main>
```

`pb-12` = 48 px di desktop. Saat halaman seperti **Daftar Laporan** punya banyak kartu yang berakhir tepat di bawah, padding 48 px terasa mepet — kartu terakhir (mis. "Adopsi Platform", "Purchasing") terlihat menempel ujung scroll dan visually "terpotong". Pada layout shell dengan `overflow-hidden`, padding bawah kecil + tinggi viewport pas-pasan membuat kesan konten tertutup.

Solusi sederhana, satu titik perbaikan yang langsung mempengaruhi **seluruh** halaman dashboard.

## Yang akan diubah

**`src/components/admin/AdminLayout.tsx`** (satu file)

1. Naikkan padding bawah area scroll dari `pb-24 md:pb-12` → `pb-32 md:pb-24` agar ada ~96 px breathing room di desktop & ~128 px di mobile. Aman dari overlap floating widget mobile (BottomNav 64 px + safe area).
2. Tambahkan `pb-2` (bukan `pb-1`) pada blok breadcrumb/title agar jarak ke area kartu lebih lega dan tidak menempel topbar.
3. Pastikan `<main>` masih `flex-1 min-h-0 overflow-y-auto` — tidak diubah, hanya padding internal.

Tidak ada perubahan pada:
- `AdminSidebar`, `DashboardTopbar`, `Breadcrumbs`.
- Halaman individual (Reports, CRM, Bookings, dll.) — semuanya otomatis ikut karena pakai layout yang sama.
- Routing, data, fitur bisnis.

## Verifikasi setelah patch
- Buka `/dashboard/reports` di desktop & mobile → kartu "Adopsi Platform" punya jarak kosong jelas di bawah.
- Buka 2–3 halaman lain (`/dashboard/bookings`, `/dashboard/customers`, `/dashboard/keuangan/report`) → tidak ada konten yang menempel ujung scroll.

## File terlibat
- **Edited**: `src/components/admin/AdminLayout.tsx`

Total perubahan: ~3 baris.
