# Plan: Pick-up Service v2 — Lebih Ringkas & Mudah

## Tujuan
1. **Customer**: ambil titik jemput cukup 1 tap (GPS) atau paste link Maps. Jarak & biaya terhitung otomatis.
2. **Staff**: update status pick-up cukup 3 tombol cepat, bukan 7 stage manual.

---

## A. Customer Side — `PickupLocationSection.tsx`

### A1. Tombol "Pakai Lokasi Saya" (GPS, utama)
- Tombol primer besar dengan icon Crosshair: minta `navigator.geolocation.getCurrentPosition()`.
- Jika izin diberikan → simpan `lat`, `lng`, reverse-geocode alamat via Nominatim (gratis) untuk auto-fill kolom alamat.
- Jika izin ditolak / gagal → tampilkan fallback otomatis.
- Tampilkan indikator akurasi (mis. "Akurat ~12 m") + tombol "Perbarui lokasi".

### A2. Fallback: Paste link Google Maps
- Input "Tempel link Google Maps" dengan parser untuk format:
  - `https://maps.google.com/?q=LAT,LNG`
  - `https://www.google.com/maps/@LAT,LNG,...`
  - `https://goo.gl/maps/...` (short link → minta user expand, atau panggil edge function `resolve-maps-link` untuk follow redirect)
- Extract lat/lng → sama seperti A1.

### A3. Kolom alamat (patokan, tetap)
- Tetap ada, tapi non-required jika lat/lng sudah terisi. Label diubah jadi "Patokan / detail tambahan (opsional)".

### A4. Mini-map preview
- Static map preview (OpenStreetMap tile via `https://staticmap.openstreetmap.de/staticmap.php?...`) — read-only, tidak perlu library berat.
- Tampilkan pin lokasi customer + pin cabang terpilih.

### A5. Auto-hitung jarak (Haversine)
- Begitu lat/lng didapat → loop semua `branches.lat/lng` aktif → pilih cabang terdekat.
- Tampilkan: "Cabang terdekat: **Stroban Cibinong** (5.4 km) — biaya jemput Rp 75.000".
- Field `distanceKm` tetap diisi otomatis (read-only, dengan tombol "edit manual" untuk kasus aneh).
- Validasi `> max_distance_km` tetap berlaku.

---

## B. Staff Side — `PickupActions.tsx`

### B1. 3 tombol cepat (ringkas)
Ganti dropdown 7-stage dengan kartu aksi cepat berbasis stage saat ini:
- **Stage `idle`** → tombol "🚗 Berangkat Jemput" (set `dispatched`, auto timestamp `pickup_dispatched_at`).
- **Stage `dispatched`/`arrived`/`car_picked`** → tombol "🏁 Mobil di Bengkel" (set `at_workshop`).
- **Stage `at_workshop`** → 2 tombol: "🏠 Antar Pulang" (jika `pickup_return=true` → set `returning`) atau "✅ Selesai" (set `returned`).
- **Stage `returning`** → tombol "✅ Selesai Diantar" (set `returned`).

### B2. Detail lanjutan (collapsible)
- Accordion "Detail lanjutan" berisi: dropdown stage manual (7-stage lama untuk fleksibilitas mundur/skip), odometer start/end, foto handover.
- Default tertutup → staff jarang perlu buka.

### B3. Quick-info baris atas (selalu terlihat)
- Tombol Maps & WA (sudah ada).
- Tombol **"Buka rute ke customer"** baru → `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG` (pakai lat/lng dari B/A bukan teks alamat).

### B4. Audit log
- Tiap klik tombol cepat → panggil `logAdminAction({action:'pickup_status_change', before, after})` (memanfaatkan helper yang sudah ada).

---

## C. Database

### Migration: `add_pickup_geo_columns`
```sql
ALTER TABLE public.branches
  ADD COLUMN lat DOUBLE PRECISION,
  ADD COLUMN lng DOUBLE PRECISION;

ALTER TABLE public.bookings
  ADD COLUMN pickup_lat DOUBLE PRECISION,
  ADD COLUMN pickup_lng DOUBLE PRECISION,
  ADD COLUMN pickup_accuracy_m INTEGER,
  ADD COLUMN pickup_source TEXT, -- 'gps' | 'maps_link' | 'manual'
  ADD COLUMN pickup_dispatched_at TIMESTAMPTZ,
  ADD COLUMN pickup_arrived_at TIMESTAMPTZ,
  ADD COLUMN pickup_at_workshop_at TIMESTAMPTZ,
  ADD COLUMN pickup_returned_at TIMESTAMPTZ,
  ADD COLUMN pickup_nearest_branch_id UUID REFERENCES public.branches(id);
```
Tidak ada perubahan RLS — kolom baru ikut policy existing.

### Seed koordinat awal
Pakai `supabase--insert` untuk isi `lat/lng` 4 cabang yang sudah ada (Cibinong, dst — saya ambil dari `directions_url` masing-masing cabang).

---

## D. File yang Disentuh

**Baru:**
- `src/lib/geoUtils.ts` — `haversineKm()`, `parseMapsLink()`, `findNearestBranch()`.
- `src/components/booking/PickupGpsButton.tsx` — tombol GPS + state.
- `supabase/functions/resolve-maps-link/index.ts` — follow redirect goo.gl → URL panjang (opsional, hanya kalau user pakai short link).
- 1 migration file.

**Diubah:**
- `src/components/booking/PickupLocationSection.tsx` — layout baru (GPS-first), auto-distance, mini-map.
- `src/components/admin/PickupActions.tsx` — 3 tombol cepat + collapsible detail.
- `src/lib/pickupSettings.ts` — tambah helper `pickupStatusForStage()` jika perlu.

**Tidak disentuh:**
- Skema RLS lama, edge functions lain, payment flow.

---

## E. Detail Teknis Singkat

- **Geolocation API**: `enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000`. Tangani error code 1 (PERMISSION_DENIED) dengan UI fallback yang ramah.
- **Reverse geocode**: `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=..&lon=..` dengan header `User-Agent: BengkelStroban/1.0`. Cache 5 menit di memory.
- **Haversine** formula standar, return km dibulatkan 0.1.
- **Static map**: fallback ke OSM jika tidak mau pakai Google API key. Tidak butuh library JS tambahan.
- **Mobile-first**: tombol GPS minimal 44 px, full-width di mobile.
- **A11y**: semua tombol baru punya `aria-label`, fokus terlihat.

---

## F. Yang TIDAK Termasuk (di luar scope)
- Live tracking driver di peta (butuh realtime channel + GPS background — bisa fase 2).
- Map picker interaktif (drag pin) — tidak dipilih user.
- Routing/ETA real (butuh Google Directions API berbayar).
