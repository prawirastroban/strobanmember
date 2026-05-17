## Audit Feedback & Diagnosa

Saya cek seluruh isi `/dashboard/feedback`:

| Source | Count | Catatan |
|---|---|---|
| internal_reports | 4 | semua status `open` |
| booking_reviews | 1 | |
| customer_complaints | 0 | |

Isi 4 laporan internal:
1. **"cabang pada hero booking"** — Prawira Zamal Mustofa (laporan inti dari user)
2. "warna logo stroban mode dark"
3. "bug pada tampilan pertama kali"
4. "Slide dots kebesaran"

### Root cause laporan #1 (yang user minta diperbaiki sekarang)

DB punya **8 cabang aktif**:
`bandung, tasikmalaya, cirebon, yogyakarta, jstationtasik, kuningan, strobanexpresstasik, bsd`

Tapi `src/components/mobile/home/HeroBookingForm.tsx` baris 68–73 **hardcode hanya 4 cabang lama**. Akibatnya:
- Sheet "Jadwal & Cabang" pada hero mobile cuma menampilkan Bandung/Tasikmalaya/Cirebon/Yogyakarta.
- Cabang baru (BSD, Kuningan, Jstation, Express) tidak pernah muncul.
- Nama cabang yang ditampilkan (`Bengkel Stroban Bandung`) tidak match dengan nama DB (`Stroban Bandung`).

Bug identik juga ada di `src/components/booking/VehicleSelector.tsx` baris 28–33 (hardcode 4 cabang yang sama).

Sumber kebenaran sudah ada: hook `useBranches()` di `src/hooks/useBranches.ts` (sesuai memory *Branches Integration* — wajib dipakai semua dropdown cabang). HeroBookingForm & VehicleSelector terlewat saat migrasi awal.

## Perbaikan

### 1. `src/components/mobile/home/HeroBookingForm.tsx`
- Hapus konstanta `BRANCHES` hardcoded.
- Pakai `useBranches()` → map ke `BranchOpt { id: slug, name, city: name }` (atau pakai `name` saja; tidak perlu kolom city karena DB tidak menyimpan city terpisah).
- Render daftar `BranchRow` dari hasil hook.
- Saat `branches` masih loading → tampilkan skeleton kecil (4 placeholder card).
- Default `branchId` set ke branch pertama (`branches[0]?.slug`) setelah data datang, hanya kalau user belum memilih.
- `useSlotAvailability` tetap dipanggil pakai `branch.id` (slug) — sudah benar.

### 2. `src/components/booking/VehicleSelector.tsx`
- Hapus konstanta `BRANCHES` hardcoded.
- Pakai `useBranches()`; map ke `{ id: slug, name }` untuk dropdown.
- Tidak ada perubahan logika lain.

### 3. Tutup laporan #1 di tabel `internal_reports`
- Setelah perbaikan applied, set `status = 'fixed'`, `fixed_at = now()`, `fixed_note = 'Hero booking form dan vehicle selector kini fetch cabang dari database via useBranches().'` untuk row title `cabang pada hero booking`.
- Dilakukan via UI Feedback Control Center (tombol "Tandai Selesai") setelah deploy — TIDAK perlu migrasi DB.

## Yang TIDAK diubah

- Tidak menyentuh 3 laporan lain (logo dark, tampilan pertama, slide dots) — di luar scope permintaan ini.
- Tidak menyentuh `useSlotAvailability`, `FeedbackControlCenter`, atau RLS.
- Tidak menambah migrasi DB.

## Detail teknis singkat

- `branches` dari hook sudah filtered `is_active = true` & sorted by `sort_order`, jadi 8 cabang akan tampil sesuai urutan admin di BranchManager.
- Saat admin menambah/menonaktifkan cabang → `invalidateBranchesCache()` langsung memantulkan perubahan ke HeroBookingForm tanpa reload.
- Grid `grid-cols-2` di sheet tetap; 8 cabang otomatis jadi 4 baris.

## Estimasi
1 prompt eksekusi, ~2 file edit (≤80 baris berubah). Tidak ada perubahan skema atau RLS.
