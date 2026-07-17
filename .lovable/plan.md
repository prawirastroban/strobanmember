## Ganti Filter Bar di halaman "Semua SPK" dengan FilterBarV2

**File**: `src/pages/spk/admin/SPKAllList.tsx`

Saat ini halaman masih memakai kombinasi `<Input>` + `<Select>` sederhana. Halaman admin lain sudah pakai `FilterBarV2` (search + quick chips + active chips + reset + result count) yang lebih rapi dan konsisten. Ganti supaya mengikuti pola tersebut, dengan opsi yang sesuai kondisi SPK saat ini.

### Perubahan

1. **Ganti blok filter** (search Input + status Select) dengan `<FilterBarV2 />` dari `@/components/admin/filters/FilterBarV2`.

2. **Konfigurasi FilterBarV2**:
   - `search`: placeholder "Cari nomor SPK, pelanggan, plat, cabang, atau telepon…", terikat ke state `q`.
   - `quickChips`: satu chip per status (mengikuti flow SPK aktif), masing‑masing menampilkan jumlah SPK pada state itu:
     - `Semua` (aktif saat `status === "all"`)
     - `Sedang Dikerjakan` (`in_progress`)
     - `Selesai` (`closed`)
     - `Dibatalkan` (`cancelled`)
     - `Draft` (`draft`)
   - `activeChips`: bila `status !== "all"`, tampilkan chip status aktif dengan tombol × untuk mereset ke `all`.
   - `resultCount`: `filtered.length`.
   - `isActive`: `true` bila `q` terisi atau `status !== "all"`.
   - `onReset`: kosongkan `q` dan set `status = "all"`.
   - Tidak memakai `advanced` sheet — tidak ada filter tambahan yang perlu.

3. **Perhitungan count per status** memakai `useMemo` dari `rows` (sekali per data load) supaya chip menampilkan angka realtime.

4. Tidak mengubah:
   - Logika fetch, realtime, mapping, sort, delete.
   - Layout kartu di bawahnya.
   - `mapDbStatus` / `STATUS_META` (sudah selaras dari perubahan sebelumnya).

### Teknis

- Import `FilterBarV2` (default export) dari `@/components/admin/filters/FilterBarV2`.
- State `q` dan `status` tetap seperti sekarang; hanya UI yang berubah, filter di `useMemo(filtered)` tidak berubah.
- Tidak ada perubahan file lain, tidak ada perubahan skema DB.
