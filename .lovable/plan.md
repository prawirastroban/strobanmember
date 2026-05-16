# Reorder & auto-branch on Pickup

## Perubahan

### 1. Tukar urutan section di `src/pages/Booking.tsx`
- **Sekarang**: Cabang → Lokasi Servis (Bengkel/Pick-up).
- **Jadi**: **Lokasi Servis dulu** (toggle Datang ke Bengkel / Pick-up Service) → baru **Cabang** di bawahnya.
- Lakukan hal serupa di `src/components/booking/MobileBookingWizard.tsx` (CompactVehicleStep): `PickupLocationSection` di atas chip cabang.

### 2. Auto-pilih cabang saat Pick-up dipilih
- Saat user toggle ke **Pick-up Service** (sebelum GPS aktif): tetap pakai cabang yang lagi terpilih (default Bandung) — tidak diubah, karena nanti akan auto-update setelah GPS / link Maps berhasil deteksi cabang terdekat (sudah jalan via `onNearestBranchDetected`).
- Saat user toggle ke **Datang ke Bengkel**: tidak ada perubahan paksa.
- Tambahkan **hint visual** di section Cabang ketika Pick-up aktif & koordinat ada: badge kecil "Otomatis dari lokasi" di samping nama cabang, supaya user tahu cabangnya menyesuaikan lokasi mereka.
- Section Cabang tetap bisa diubah manual (override) baik untuk workshop maupun pickup.

### 3. Tidak diubah
- Logika `onNearestBranchDetected`, perhitungan biaya, hard-block over-limit, mode tarif (sudah berjalan).
- DB schema, RLS, edge functions.

## File yang akan diubah

- `src/pages/Booking.tsx` — pindahkan blok `PickupLocationSection` ke atas blok Cabang; tambah badge "Otomatis dari lokasi" di header cabang saat pickup+coords.
- `src/components/booking/MobileBookingWizard.tsx` — pindahkan `PickupLocationSection` ke atas `BRANCHES_COMPACT` chips di `CompactVehicleStep`.

Setelah disetujui, implement langsung dalam 1 batch.
