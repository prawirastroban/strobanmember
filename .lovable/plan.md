# Pickup Service v3 — Auto-branch, Hard-limit & Tarif per-km

## 1. Auto-pilih cabang terdekat dari GPS / link Maps

**Masalah saat ini:** `findNearestBranch` sudah jalan dan menampilkan nama cabang, tapi pilihan cabang di form (`selectedBranchId` di `Booking.tsx` & `branch` di `MobileBookingWizard.tsx`) **tidak ikut berubah**. Selain itu `BRANCHES` di `Booking.tsx` masih hard-coded (`bandung`, `tasikmalaya`, dst.) sedangkan DB pakai UUID — perlu mapping by **slug/name/city**.

**Yang akan dibuat:**
- `PickupLocationSection` menerima callback baru `onNearestBranchDetected(branch: BranchGeo)`.
- Saat GPS / link Maps berhasil → panggil callback dengan branch terdekat (lengkap: id, name, slug).
- Di `Booking.tsx`: cocokkan `branch.slug` / `branch.name` ke entry `BRANCHES` lokal → set `selectedBranchId`. Tampilkan toast "Cabang otomatis dipilih: {nama}".
- Di `MobileBookingWizard.tsx`: set `branch` ke id yg cocok.
- User tetap bisa override manual; jika user ganti cabang manual setelah auto-pilih, hormati pilihannya (jangan override lagi sampai lokasi diubah).

## 2. Hard-block jika jarak melebihi `max_distance_km`

**Sekarang:** jika over-limit hanya tampil warning kecil, tapi `pickupFee` & `returnFee` tetap dihitung dan tombol submit kadang masih bisa ditekan tergantung `isValid`.

**Yang akan diperbaiki:**
- Saat `applyCoords` mendeteksi `nearest.distanceKm > settings.max_distance_km`:
  - Tetap simpan koordinat tapi set `isValid = false` & `pickupFee = 0`, `returnFee = 0`.
  - Tampilkan banner merah jelas: "Lokasi {X} km — di luar jangkauan ({max} km dari {cabang terdekat}). Silakan pilih lokasi lain atau datang ke bengkel."
  - Sembunyikan ringkasan biaya (atau tampilkan "—").
- Jika user input `distanceKm` manual > max → block sama.
- Tombol "Pakai Lokasi Saya" tetap aktif, tapi paste link / GPS yg over-limit langsung kasih toast error & tidak isi field jarak.
- `Booking.tsx` & `MobileBookingWizard.tsx` sudah cek `pickup.isValid` sebelum submit — pastikan validasi konsisten.

## 3. Mode tarif: Flat vs Per-Km

`PickupSettings.fee_mode: "flat" | "per_km"` sudah ada di tipe tapi belum ada UI/perhitungan.

**Yang akan dibuat:**

### A. UI Settings (`/dashboard/pickup-settings` → `PickupSettingsCard.tsx`)
Tambah toggle / radio "Mode Tarif":
- **Flat** (default, sekarang) — `base_fee` & `return_fee` berlaku flat.
- **Per Kilometer** — input baru:
  - `pickup_per_km_fee` (Rp/km untuk jemput)
  - `return_per_km_fee` (Rp/km untuk antar pulang)
  - opsional: `min_pickup_fee` & `min_return_fee` (tarif minimal walaupun jarak pendek).

### B. Perhitungan
Tambah helper baru di `pickupSettings.ts`:
```ts
calcPickupFees(s, distanceKm, withReturn) → { pickupFee, returnFee }
```
- `flat` → `base_fee` + `return_fee` (jika withReturn).
- `per_km` → `max(min_pickup_fee, distanceKm * pickup_per_km_fee)` + return.

### C. Display di `PickupLocationSection`
- Saat mode `per_km`: tampilkan rincian `"{X} km × Rp{tarif}/km = Rp{total}"` di blok ringkasan biaya.
- Tombol toggle Pickup/Workshop juga update label estimasi: "Mulai Rp{min} • max {km} km" untuk per-km.

### D. Migration / Storage
Tidak perlu migration — `app_settings.value` adalah `jsonb` bebas. Cukup extend `PickupSettings` interface & `DEFAULT_PICKUP_SETTINGS`:
```ts
fee_mode: "flat" | "per_km"
pickup_per_km_fee: number   // default 0
return_per_km_fee: number   // default 0
min_pickup_fee: number      // default 0
min_return_fee: number      // default 0
```

## 4. File yang akan diubah

- `src/lib/pickupSettings.ts` — extend interface, tambah `calcPickupFees()`.
- `src/components/admin/PickupSettingsCard.tsx` — tambah toggle mode & input per-km.
- `src/components/booking/PickupLocationSection.tsx` — auto-select callback, hard-block over-limit, rincian per-km.
- `src/pages/Booking.tsx` — handler auto-select cabang (slug/name match).
- `src/components/booking/MobileBookingWizard.tsx` — handler auto-select cabang.
- `src/lib/geoUtils.ts` — pastikan `BranchGeo` mengexpose `slug` (sudah ada di table; cek select).

## 5. Tidak diubah

- Database schema (cukup pakai jsonb existing).
- RLS, edge functions, audit log, alur staff `PickupActions`.
- Logika GPS / parser link Maps / Haversine (sudah jalan).

Setelah disetujui, saya implement dalam 1 batch dan verifikasi via build + smoke test di /booking.
