## Ganti opsi filter status di halaman "Semua SPK"

**File**: `src/pages/spk/admin/SPKAllList.tsx`

Filter saat ini masih menampilkan status lama (`Draft`, `Waiting Approval`, dst) padahal flow SPK sekarang sudah disederhanakan — SPK baru langsung dibuat sebagai `in_progress` (approval customer sudah diselesaikan di `/spk/new`), lalu berakhir ke `closed` atau `cancelled`. Opsi `waiting_approval` dan `pending` sudah tidak pernah muncul lagi di database.

### Perubahan

1. **Dropdown filter** (baris 388–398): sisakan opsi sesuai kondisi SPK yang benar-benar ada:
   - Semua status
   - Sedang Dikerjakan (`in_progress`)
   - Selesai (`closed`)
   - Dibatalkan (`cancelled`)
   - Draft (`draft`) — dipertahankan sebagai fallback bila ada SPK lama

2. **Bersihkan `mapDbStatus`** (baris 62–74): hapus branch `waiting_approval` / `awaiting_customer_approval` / `qc_pending` karena tidak lagi digunakan di flow baru, dan hapus tipe `waiting_approval` & `pending` dari `UiStatus`, `PROGRESS_BY_STATUS`, dan `STATUS_META`.

3. Tidak ada perubahan logika filter lain — `status !== "all" && r.db_status !== status` tetap dipakai; hanya nilai opsinya yang disesuaikan.

Tidak ada perubahan pada file lain, tidak ada perubahan skema DB.
