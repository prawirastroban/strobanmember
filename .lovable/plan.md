## Masalah

Di halaman SPK / Work Order, kartu **Mechanic Load** dan **Branch Load** menampilkan potongan UUID (`58da7e24…`, `6cbaf198…`) karena `SPKDomainDashboard.tsx` hanya mengelompokkan `current_owner_user_id` dan `branch_id` tanpa mengambil nama.

## Perbaikan

Di `src/pages/spk/admin/SPKDomainDashboard.tsx`:

1. Setelah data `spk_orders` dimuat, kumpulkan ID unik mekanik & cabang lalu ambil namanya dalam dua query paralel:
   - `profiles` → `id, full_name` (untuk mekanik)
   - `branches` → `id, name` (untuk cabang)
2. Simpan hasilnya sebagai peta `id → nama` di state.
3. Saat merender kedua kartu, tampilkan nama. Jika nama tidak ditemukan (data terhapus / kosong), tampilkan label ramah seperti `Mekanik tidak dikenal` dan `Cabang tidak dikenal` — bukan potongan UUID.
4. Tetap pakai `truncate` + `title` agar nama panjang tidak merusak layout dan bisa dilihat penuh saat hover.

Tidak ada perubahan pada query agregasi, KPI, SLA, workflow, atau database — hanya lapisan tampilan.
