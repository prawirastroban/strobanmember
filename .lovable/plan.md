## Tujuan
Sidebar submenu **SPK / Work Order** dirapikan: `Queue`, `New SPK`, dan `Workflow` dihapus. Fitur Queue + New SPK dipindahkan ke halaman **All SPK** sebagai tombol aksi di header. Route dan halaman lama tetap ada (backward-compat) agar link `/spk`, `/spk/new`, dsb. tidak putus.

## Perubahan

### 1. `src/pages/spk/admin/SPKAllList.tsx` (tambah header aksi)
Tambahkan baris tombol di atas filter:
- **"Buka Queue"** → `navigate("/spk")` (ikon `ClipboardList`)
- **"+ Buat SPK Baru"** → `navigate("/spk/new")` (ikon `Plus`, tampil hanya untuk `canManage`)

Layout: flex row, tombol di kanan; filter search + status dipindah rapi di bawahnya. Ini menjadikan All SPK titik masuk tunggal untuk melihat antrian dan membuat SPK.

### 2. `src/config/dashboardMenu.ts` (bersihkan submenu)
Hapus 3 entry dari `children` submenu `SPK / Work Order`:
- `{ title: "Queue", url: "/spk", ... }`
- `{ title: "New SPK", url: "/dashboard/spk/new", ... }`
- `{ title: "Workflow", url: "/dashboard/spk/workflow", ... }`

Submenu final menjadi: Dashboard, All SPK, Template Builder, Automation, Configuration, Analytics, Reports.

### 3. `src/pages/spk/admin/SPKDomainDashboard.tsx` (bersihkan tile Quick Access)
Hapus 3 tile: `Queue`, `New SPK`, `Workflow` dari daftar tile agar landing SPK Dashboard konsisten dengan sidebar.

### 4. Route & halaman — TIDAK dihapus
- `/spk` (SPKWorkQueue) tetap ada karena masih dipakai FAB, deep-link `?action=new`, tombol "Buka Queue" baru, dan tombol back navigation di beberapa flow.
- `/spk/new` (SPKNewForm) tetap ada karena dipakai FAB, redirect legacy, dan tombol "Buat SPK Baru" baru.
- `/dashboard/spk/new` (SPKNewPage) tetap sebagai redirect page — masih dirujuk oleh route Admin, aman didiamkan.
- `/dashboard/spk/workflow` (SPKWorkflowViewer) route Admin tetap ada untuk backward-compat internal; hanya entri sidebar/tile yang dihilangkan sesuai permintaan. (Jika Anda ingin route ikut dihapus, sebutkan — saya akan tambahkan itu ke plan.)

## Verifikasi
- Sidebar tidak lagi menampilkan Queue / New SPK / Workflow di bawah SPK / Work Order.
- Buka **All SPK** → dua tombol "Buka Queue" dan "+ Buat SPK Baru" berfungsi ke `/spk` dan `/spk/new`.
- FAB di `/spk` dan flow booking → SPK tetap jalan.
- `bunx tsgo` bersih.

## Catatan teknis
Perubahan murni UI + config sidebar; tidak menyentuh runtime, workflow engine, atau data. Route lama sengaja dibiarkan agar tautan yang tersimpan (bookmark, share) dan navigasi programatik tidak error.
