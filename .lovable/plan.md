## Tujuan

Refresh tampilan `/dashboard` menjadi gaya **Accurate Online**: sidebar vertikal bersih dengan ikon+teks, topbar berbasis **tab** (multi-tab bisa ditutup), **filter bar** global (Tanggal / Cabang / Status / Search + tombol Tambah Data / Refresh / Filter), dan konten utama berupa **grid kartu kategori** (Operasional hijau, Marketing biru, Inventori & Stok ungu) — tanpa mengubah backend / route / RLS.

## Skema Warna Kategori (dari mockup)

| Kategori | BG kartu | Border | Ikon |
|---|---|---|---|
| Operasional | `#E8F5EC` | `#CDE8D5` | `#2E8B57` |
| Marketing | `#E6F0FF` | `#CFE0FB` | `#2F6FE5` |
| Inventori / Lainnya | `#F1ECFA` | `#E0D6F5` | `#7E5BD9` |

Tokens ditambahkan ke `index.css` (HSL) + `tailwind.config.ts` (`accurate-green`, `accurate-blue`, `accurate-violet`, masing-masing `-bg`, `-border`, `-fg`). Sidebar aktif tetap pakai brand merah `#ff2b2b` (sudah ada).

## Perubahan File

### 1. `src/components/admin/AdminLayout.tsx` (refactor besar)
- Pindahkan header sederhana → komponen baru `DashboardTopbar` + `DashboardFilterBar`.
- Tambah state `tabs` (array `{path,title}`) di React Context baru `DashboardTabsContext` (di `src/contexts/DashboardTabsContext.tsx`) — pakai `sessionStorage` agar tab persist saat refresh.
- Saat user navigasi via sidebar → tab baru di-push; klik tab = `navigate(path)`; klik `x` = hapus tab + navigate ke tab tetangga.
- Background main berubah dari `bg-background` → `bg-[hsl(var(--dashboard-bg))]` (`#F5F6FA`).

### 2. `src/components/admin/DashboardTopbar.tsx` (baru)
- Strip tab horizontal (scroll-x), tab aktif = merah brand + teks putih, tab non-aktif = abu muda + teks gelap, tombol `+` paling kanan untuk reopen recent.
- Profile chip (avatar + nama + role) di kanan atas (sudah ada di Navbar — di sini cukup notifikasi bell).

### 3. `src/components/admin/DashboardFilterBar.tsx` (baru, opsional per-halaman)
- Dropdown: Tanggal (Semua/Hari ini/Minggu/Bulan/Custom), Cabang (dari `useBranches`), Status (depend halaman, default "Semua"), Search input.
- Tombol kanan: `Tambah Data` (primary biru, hanya muncul kalau prop `onAdd` di-pass), `Refresh` (icon), `Filter` (icon → buka sheet filter lanjutan).
- Konteks `DashboardFilterContext` agar halaman child bisa baca nilai filter tanpa prop drilling. Halaman yang belum perlu filter cukup tidak me-render bar (prop `showFilters={false}` di AdminLayout).

### 4. `src/components/admin/AdminSidebar.tsx` (style only)
- Item aktif: background merah `#ff2b2b` + teks putih (ikon putih) — sudah mendekati, perketat radius `rounded-lg`, padding `py-2.5 px-3`, font `text-sm font-medium`.
- Item non-aktif: hover `bg-muted/60`, ikon ukuran 18px.
- Group label: uppercase 11px, tracking-wider, abu.
- Divider tipis antar grup.
- Tidak mengubah `menuItems` / routing.

### 5. `src/components/admin/AdminDashboard.tsx` (revamp section atas)
- Tambahkan blok baru **"DashboardMenuGrid"** di paling atas (sebelum KPI yang sudah ada), 3 section:
  - **Operasional** — Confirmation Bookings, Kapasitas Slot, Pick-up Service, CRM, Customers & Vehicles, Pengaturan Cabang.
  - **Marketing** — Overview, Services, Promo, Loyalty, Rewards, Branding & Logo.
  - **Lainnya** — Transaction History, Daftar Laporan, Keuangan, Legal & Dokumen, Audit Log, Bug & Masukan.
- Kartu: `aspect-square` (di desktop, `h-28` di mobile), ikon 28px di tengah atas, label di bawah, radius 8px, shadow `sm`, hover `scale-[1.02]` + shadow `md`.
- Komponen baru: `src/components/admin/DashboardMenuGrid.tsx`.
- Hormati role: kartu yang `requiredRole='owner'` disembunyikan untuk non-staff (re-use logic dari AdminSidebar).
- Section KPI + chart existing tetap dipertahankan di bawah grid (tidak dihapus, hanya didorong ke bawah dan diberi heading "Ringkasan").

### 6. `src/index.css` & `src/tailwind.config.ts`
- Tambah HSL tokens:
  - `--dashboard-bg: 220 14% 97%;`
  - `--accurate-green-bg / -border / -fg`
  - `--accurate-blue-bg / -border / -fg`
  - `--accurate-violet-bg / -border / -fg`
  - `--tab-active-bg: var(--primary);` `--tab-inactive-bg: 220 13% 91%;`
- Map ke Tailwind colors `dashboard.bg`, `accurate.green.bg`, dst.

### 7. Responsif
- ≥`lg`: sidebar permanent, grid 6 kolom.
- `md`: sidebar permanent ikon-only (sudah didukung `collapsible="icon"`), grid 3 kolom.
- `<md`: sidebar jadi drawer (Sheet — sudah didukung shadcn), tabs scroll horizontal, filter bar collapse jadi tombol "Filter" yang membuka Sheet, grid 2 kolom.

## Yang TIDAK Diubah
- Route definitions di `Admin.tsx`.
- Akses role / RLS / migrations.
- Komponen halaman child (`BookingsManager`, `CustomerList`, dll) — mereka tetap render di `<main>` slot.
- Brand merah utama & glass identity (hanya area dashboard yang dipucatkan jadi `#F5F6FA`).

## Verifikasi
1. Buka `/dashboard` → terlihat tab "Dashboard" aktif merah, filter bar, dan grid 3 kategori warna hijau/biru/ungu.
2. Klik kartu "Confirmation Bookings" → buka tab baru, pindah route, tab "Dashboard" tetap ada.
3. Klik `x` pada tab → kembali ke tab tetangga, URL ikut berubah.
4. Login sebagai `admin_cabang` → kartu Marketing, Pengaturan Cabang, Audit Log, dll tidak muncul.
5. Resize ke 375px → sidebar jadi drawer, grid 2 kolom, filter jadi tombol.
6. Refresh halaman di tengah tab `/dashboard/customers` → tab list tetap utuh.
