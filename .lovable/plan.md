# Gabung "Lokasi Servis" + "Cabang" + Sinkron DB

## Tujuan
1. **Satu kartu terpadu** "Lokasi Servis" — gabung mode (Bengkel / Pick-up) + pemilihan cabang.
2. **Datang ke Bengkel** → tampilkan grid pilihan cabang di bawah toggle.
3. **Pick-up Service** → cabang otomatis ke yang terdekat (Haversine) setelah GPS/Maps; sembunyikan grid pilih manual, tampilkan kartu cabang terpilih (read-only + badge "Otomatis dari lokasi").
4. **Sinkronisasi penuh** dengan tabel `branches` (yang dikelola di `/dashboard/branches`) — tidak lagi pakai `const BRANCHES` hardcoded di `Booking.tsx`.

## Perubahan File

### `src/components/booking/PickupLocationSection.tsx`
- Tambah props baru:
  - `branches: { id, slug, name, address, lat, lng }[]` (live dari DB).
  - `selectedBranchId: string`
  - `onSelectBranch: (id: string) => void`
- Render struktur baru di dalam kartu yang sama:
  - Header: ikon MapPin + judul "Lokasi Servis"
  - Toggle: **Datang ke Bengkel** | **Pick-up Service** (sudah ada).
  - **Mode Bengkel**: render grid/scroller chip cabang (pindahan dari `Booking.tsx`), pakai `branches` prop.
  - **Mode Pick-up**: blok GPS/Maps + ringkasan biaya + kartu cabang terpilih (read-only, badge "Otomatis dari lokasi"), tetap dengan hard-block jarak > max.
- Logika auto-pilih cabang terdekat (Haversine) dipindah ke dalam komponen — gunakan `branches.lat/lng` dari DB; panggil `onSelectBranch(nearest.id)` saat koordinat berubah.

### `src/pages/Booking.tsx`
- Hapus `const BRANCHES` hardcoded + `DEFAULT_BRANCH`.
- Pakai `useBranches()` (perluas hook agar mengembalikan `address`, `lat`, `lng` juga — saat ini hanya `id, slug, name`).
- `selectedBranchId` default = branch pertama hasil DB (atau cocokan `preBranch` ke `slug/name`).
- Hapus blok JSX "Branch (di bawah Lokasi Servis)" — sudah pindah ke dalam `PickupLocationSection`.
- `selectedBranch` derivasi memakai data dari `useBranches()`.
- Submit booking tetap kirim slug/id branch sesuai skema yang ada.

### `src/components/booking/MobileBookingWizard.tsx`
- Step Cabang (BRANCHES_COMPACT) diganti baca dari `useBranches()`.
- Step Pickup: kirim `branches` + `selectedBranchId` + `onSelectBranch` ke `PickupLocationSection`. Kalau pickup aktif & terdeteksi koordinat, lewati/auto-isi step Cabang.

### `src/hooks/useBranches.ts`
- Perluas select: `id, slug, name, address, lat, lng` (selain `is_active`).
- Update interface `BranchOption` dengan field opsional `address`, `lat`, `lng`.

## Yang TIDAK Diubah
- Tabel `branches`, RLS, edge functions, `pickup_settings`, formula tarif, hard-block jarak max.
- `BranchManager.tsx` (admin) — sudah jadi sumber data.
- Logika submit/checkout/voucher/cart.

## Catatan UX
- Saat Pick-up + sudah ada koordinat: cabang TIDAK bisa diubah manual (mengikuti aturan "otomatis terdekat"). Jika user mau pilih cabang lain, mereka switch ke mode "Datang ke Bengkel".
- Saat Pick-up tapi belum isi GPS/Maps: tampilkan placeholder "Cabang akan ditentukan otomatis dari lokasi Anda".
