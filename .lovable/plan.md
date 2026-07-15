Hapus halaman **SPK Queue** (`/spk`) dan pindahkan seluruh fiturnya ke halaman **All SPK** (`/dashboard/spk/all`) sehingga hanya ada satu daftar SPK terpadu.

## Perubahan

### 1. `src/pages/spk/admin/SPKAllList.tsx` — dirombak menjadi daftar terpadu
Gabungkan tampilan kaya milik Queue ke dalam All SPK:
- **Enrichment**: query tambahan ke `profiles` (customer name/phone), `vehicles` (brand/model/year/plate), dan `bookings` (fallback customer & car) untuk tiap SPK, mengikuti pola `SPKWorkQueue.tsx` baris 391-420.
- **Kartu SPK** memakai layout Queue: nomor SPK + status badge, nama pelanggan, deskripsi kendaraan, no. polisi, progress bar, jam masuk, badge prioritas. Tetap tampilkan tombol **Edit / Hapus** untuk `staff | admin | admin_cabang`.
- **Search** meluas ke nomor SPK, nama pelanggan, plat, telepon (pola Queue baris 484-494).
- **Filter status** tetap menggunakan `Select` (`all | draft | in_progress | waiting_approval | closed | cancelled`).
- **Realtime**: subscribe channel `spk_orders` + `focus` listener untuk refresh (pola Queue baris 467-482).
- **Header tetap**: judul "Semua SPK" + tombol **"Buat SPK Baru"**. Tombol **"Buka Queue" dihapus** karena Queue tidak ada lagi.
- **Sumber shared**: helper `mapDbStatus`, `PROGRESS_BY_STATUS`, `STATUS_META`, `fmtTime`, `asSnapshot`, `textValue` diinline-kan ke file ini agar Queue bisa dihapus tanpa dependency.

### 2. Routing & pembersihan
- `src/App.tsx`: import `SPKWorkQueue` dihapus; route `/spk` diarahkan lewat `<Navigate to="/dashboard/spk/all" replace />`. Legacy deep-link `/spk?action=new` ditangani di All SPK sebagai fallback: bila `searchParams.action === "new"`, redirect ke `/spk/new`.
- `src/pages/Admin.tsx` baris 173: redirect `spk/queue` diarahkan ke `/dashboard/spk/all`.
- `src/config/pageRegistry.ts`: entry `/spk` → judul jadi "SPK Redirect" atau dihapus (dihapus, karena tidak lagi jadi halaman aktif).
- `src/components/admin/AdminSidebar.tsx` baris 43: `isSpkSection` disederhanakan menjadi hanya `isInSection("/dashboard/spk")` (bagian `|| isInSection("/spk")` dihapus karena sudah tidak ada halaman `/spk` non-redirect).

### 3. Hapus file
- `src/pages/spk/SPKWorkQueue.tsx` dihapus.

### 4. Yang **tidak** diubah
- Skema DB, RLS, edge functions, `SPKService`, workflow, signatures, print — semua utuh.
- Route `/spk/new`, `/spk/:id`, `/spk/:id/print`, `/spk/:id/approve` tetap.
- Menu sidebar & dashboard: entry "All SPK" tetap satu-satunya pintu masuk daftar.
