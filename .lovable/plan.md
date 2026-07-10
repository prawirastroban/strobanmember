## Objective
Ganti data dummy `MOCK_SPKS` di halaman `/spk` (SPKWorkQueue) dengan data live dari database, sehingga siap diuji dengan akun asli ("ganteng") dari HP (konsumen) dan web (admin).

## Scope (UI/Presentation only)
Hanya menyentuh `src/pages/spk/SPKWorkQueue.tsx`. Tidak mengubah runtime, workflow, automation, atau schema.

## Changes

### 1. `src/pages/spk/SPKWorkQueue.tsx`
- Hapus konstanta `MOCK_SPKS` sepenuhnya.
- Tambahkan fetching live dari `spk_orders` (via `supabase` client, konsisten dengan `SPKAllList.tsx`):
  - Select: `id, spk_number, status, priority, created_at, customer_id, vehicle_id`, order `created_at desc`, limit 100.
  - Join ringan untuk display: ambil `customer_name` + `phone` dari `profiles` (via customer_id) dan `vehicle_desc` + `plate_number` dari `vehicles` (via vehicle_id). Gunakan dua query paralel dengan `.in('id', ids)` lalu map di client (aman terhadap RLS, tidak butuh view baru).
  - Fallback tampilan jika relasi kosong: `"Pelanggan —"` / `"Kendaraan —"` / `"—"` untuk plat.
- Mapping status DB → status UI:
  - `in_progress` → `in_progress`
  - `draft`, `pending` → `pending`
  - `waiting_approval` → `waiting_approval`
  - `closed` (created hari ini) → `completed_today`; `closed` (lain) disembunyikan agar list tetap fokus operasional.
  - `cancelled` disembunyikan dari antrian.
- `entry_time` diturunkan dari `created_at` (`HH:mm`, locale id-ID).
- `progress_pct`: gunakan heuristik ringan dari status (pending=0, in_progress=50, waiting_approval=85, completed_today=100). Tidak memanggil runtime engine (menjaga scope UI-only).
- Loading state: skeleton/spinner sederhana di dalam `<main>` saat fetch pertama.
- Empty state: pesan "Belum ada SPK — tekan + untuk membuat SPK baru." Tetap pertahankan tombol FAB.
- Tetap pertahankan struktur grouping, search filter, priority sort, sticky header, dan tombol back yang sudah ada.
- Optional realtime refresh: subscribe ke `postgres_changes` pada `spk_orders` untuk auto-refresh list (ringan, tanpa engine baru). Jika terlalu invasif, cukup refetch saat window `focus`.

### 2. Verifikasi
- Type-check otomatis via harness.
- Buka `/spk` di preview — pastikan tidak ada lagi Budi Santoso/Siti Aminah, list muncul dari DB, FAB tetap menuju `/spk/new`, klik card menuju `/spk/:id`.

## Non-goals
- Tidak menyentuh admin pages (`SPKAllList`, dashboard, analytics) — sudah live.
- Tidak mengubah schema, RLS, workflow, atau intake form.
- Tidak menambah service baru; fetch inline di halaman (konsisten dengan `SPKAllList.tsx`).

## Catatan uji
Setelah perubahan siap, kamu dapat:
- Login sebagai admin di web → buka `/spk` untuk memantau antrian real.
- Login sebagai user "ganteng" di HP → buat booking / SPK; entri baru akan muncul otomatis di antrian admin.
