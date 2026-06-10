## Tujuan

Tambahkan **"Keluhan Kendaraan"** sebagai menu top-level di sidebar & overview, dengan url `/dashboard/complaints`. Saat ini hanya ada sebagai child di bawah grup CRM.

## Kategori

Auto-categorization sudah menempatkan `/dashboard/complaints` ke **PUSAT KONTROL** (lihat `URL_RULES` di `src/config/dashboardMenu.ts`). Jadi cukup tambahkan entry baru — kategori terisi otomatis, tidak perlu override `section`.

## Perubahan

**File:** `src/config/dashboardMenu.ts`

1. Tambahkan satu entry top-level di `dashboardMenu` (di blok Pusat Kontrol, dekat "Permintaan Koreksi" & "Bug & Masukan"):
   ```ts
   { title: "Keluhan Kendaraan", url: "/dashboard/complaints", icon: MessageSquareWarning },
   ```
2. Hapus duplikatnya sebagai child di grup CRM (children `CRM` jadi hanya `Overview`).
   Karena tersisa satu child saja, sederhanakan: ubah grup `CRM` menjadi item flat (tanpa `children`) yang langsung membuka `/dashboard/crm`. Ini juga merapikan sidebar (collapsible 1-item tidak perlu).
   - Hapus juga state `marketingOpen`-style untuk CRM (tidak ada — `renderCollapsible` untuk CRM tidak ada, jadi tidak ada cleanup tambahan di `AdminSidebar.tsx`).

## Yang TIDAK Diubah

- Tidak menyentuh route, halaman `Complaints`, RLS, edge function, atau role.
- Tidak mengubah `inferSection`, `SECTION_ORDER`, atau auto-categorization engine.
- Sidebar/overview consumer tidak diubah — entry baru otomatis muncul lewat `getSidebarSections` & `getOverviewTiles`.

## Verifikasi

- Reload `/dashboard` → "Keluhan Kendaraan" muncul di group **Pusat Kontrol** di sidebar (bersama Permintaan Koreksi & Bug & Masukan).
- Tile overview Pusat Kontrol berisi 3 item.
- Badge "Keluhan kendaraan baru" tetap berfungsi (sumber `useDashboardBadges` tidak diubah).
- Grup CRM di sidebar tinggal satu item flat → klik langsung ke `/dashboard/crm`.
