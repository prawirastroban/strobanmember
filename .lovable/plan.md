## Fitur Baru: Bug Report & Masukan Internal

Menu baru di Dashboard Panel khusus untuk role internal (staff/Owner, admin/CS, admin_cabang). Customer biasa tidak punya akses. Semua report masuk ke satu halaman baru dengan daftar temuan bug, revisi, atau masukan beserta gambar dan catatan. Hanya role **staff (Owner)** yang bisa menandai status "Sudah Diperbaiki".

### 1. Database (migration baru)

Tabel `internal_reports`:
- `id`, `created_at`, `updated_at`
- `reporter_id` (uuid) — user yang submit
- `reporter_name`, `reporter_role` (snapshot saat submit)
- `category` (text): `bug` | `revisi` | `masukan`
- `title` (text, singkat)
- `description` (text, catatan detail)
- `image_url` (text, nullable)
- `page_url` (text, nullable) — halaman tempat masalah ditemukan
- `status` (text): `open` | `in_progress` | `fixed`
- `fixed_at` (timestamptz, nullable)
- `fixed_by` (uuid, nullable)
- `fixed_note` (text, nullable)

RLS:
- INSERT: hanya user dengan role `admin`, `staff`, atau `admin_cabang` (customer ditolak).
- SELECT: semua role internal di atas bisa lihat semua report.
- UPDATE status `fixed`/`fixed_note`: **hanya `staff`** (Owner).
- UPDATE field lain (edit/hapus draft sendiri): reporter boleh edit miliknya selama belum `fixed`.
- DELETE: reporter sendiri (sebelum fixed) atau staff.

Storage bucket baru `internal-reports` (public read) untuk lampiran gambar, dengan policy upload hanya untuk role internal.

### 2. Halaman baru di Dashboard

Route: `/dashboard/feedback` (label menu: **"Bug & Masukan"**).

Komponen baru:
- `src/components/admin/internal/InternalReports.tsx` — halaman utama
- `src/components/admin/internal/ReportFormDialog.tsx` — form tambah/edit (judul, kategori, deskripsi, upload gambar, page URL auto-fill)
- `src/components/admin/internal/ReportCard.tsx` — baris/card untuk tiap report

Layout halaman (gaya glassmorphism konsisten):
- Header: judul + tombol "Tambah Report"
- Filter bar: kategori (Semua/Bug/Revisi/Masukan), status (Semua/Open/In Progress/Fixed), search
- Daftar (grid responsif): tiap kartu menampilkan thumbnail gambar, kategori badge, judul, catatan (truncate + popover untuk full), nama pelapor + role + tanggal, status badge.
- Tombol aksi:
  - Reporter (semua role internal): Edit / Hapus (jika belum fixed)
  - **Owner (`staff`) saja**: tombol "Tandai Sudah Diperbaiki" + opsi tulis catatan perbaikan. Setelah fixed, kartu pindah ke status hijau dan menampilkan `fixed_by`, `fixed_at`, `fixed_note`.

### 3. Integrasi navigasi

- `AdminSidebar.tsx`: tambah item menu "Bug & Masukan" (icon `Bug` dari lucide), tampil untuk semua role internal.
- `Admin.tsx` / router dashboard: daftarkan route `/dashboard/feedback` → `InternalReports`.
- Akses dijaga: gunakan `useUserRole()` — jika `isCustomer`, redirect ke `/dashboard`.

### 4. Logika frontend

- Fetch list dengan Supabase + realtime channel `internal_reports` agar update status langsung muncul.
- Upload gambar ke bucket `internal-reports` dengan path `${user.id}/${uuid}.jpg`.
- Tombol "Tandai Sudah Diperbaiki" hanya dirender bila `isStaff === true`.
- i18n: tambah key Bahasa Indonesia (default) di `id.ts` dan terjemahan `en.ts`.

### 5. Memory

Tambah `mem://features/internal-bug-reports` dan referensikan di `mem://index.md`.

### Catatan teknis

```text
Dashboard
 └── Bug & Masukan (/dashboard/feedback)
      ├── [Form] tambah report (semua role internal)
      ├── [List] kartu report + filter
      └── [Action] "Sudah Diperbaiki" (Owner only)
```

Tidak ada perubahan pada flow customer; menu ini benar-benar terpisah dan hanya muncul di Dashboard Panel.
