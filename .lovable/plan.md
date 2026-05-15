## Tujuan

Tambah opsi **Pick-up Service** pada alur booking + action operasional di `/dashboard/bookings` untuk booking jenis pick-up.

---

## 1) Database (migration baru)

**Tambah kolom di tabel `bookings`:**
- `service_location` text NOT NULL DEFAULT `'workshop'` — `workshop` | `pickup`
- `pickup_address` text
- `pickup_distance_km` numeric
- `pickup_fee` numeric DEFAULT 0
- `pickup_return` boolean DEFAULT false (opsional drop-off kembali)
- `pickup_status` text DEFAULT `'idle'` — `idle | dispatched | arrived | car_picked | at_workshop | returning | returned`
- `pickup_driver_id` uuid (staff yang ditugaskan)
- `pickup_odometer_start` integer, `pickup_odometer_end` integer
- `pickup_handover_photos` jsonb DEFAULT `'[]'` (array URL foto serah-terima sebelum & sesudah)
- `pickup_notes` text

**Tambah ke `app_settings` (key = `pickup_service`):**
```json
{
  "enabled": true,
  "max_distance_km": 15,
  "base_fee": 75000,
  "return_fee": 50000,
  "fee_mode": "flat"   // ruang untuk per-km nantinya
}
```

**Storage bucket baru:** `pickup-handover` (private, RLS: staff full, user view own booking).

---

## 2) Settings panel admin (baru)

Halaman / kartu di Admin Settings:
- Toggle **Aktifkan Pick-up Service**
- Input **Jarak maksimum (km)** dari cabang
- Input **Biaya jasa jemput (Rp)**
- Input **Biaya antar kembali (Rp)** (untuk opsi drop-off)
- Disimpan ke `app_settings` (sudah ada infrastrukturnya).

---

## 3) Halaman Booking (`/booking` & MobileBookingWizard)

Section baru **"Lokasi Servis"** sebelum pemilihan cabang:

```
[ Datang ke bengkel ]   [ Pick-up dari lokasi ]
```

Jika **Pick-up** dipilih:
- Textarea **Alamat lengkap** (validasi Zod min 10 char, max 500)
- Input **Estimasi jarak (km)** dari cabang yang dipilih
  - Validasi: tidak boleh > `max_distance_km` (ambil dari settings)
  - Jika lewat: tampil pesan "Lokasi di luar area pick-up (max X km)"
- Checkbox **Sekalian antar kembali setelah selesai** (opsional)
- Ringkasan biaya:
  - Biaya jemput: Rp xx.xxx
  - Biaya antar (jika dicentang): Rp xx.xxx
- Total `service_price` di-recompute = harga layanan + pickup_fee + (return_fee jika ada).

Saat submit, isi semua kolom `pickup_*` sesuai pilihan.

---

## 4) `/dashboard/bookings` — Action tambahan untuk Pick-up

**Visual marker:**
- Badge baru di row booking: `Pick-up` / `Pick-up + Antar` (warna ungu) di sebelah badge status existing.
- Filter tab tambahan: **Pick-up** untuk memfilter booking jenis pick-up.

**Detail / row action (hanya muncul jika `service_location='pickup'`):**

1. **Buka Maps** — tombol cepat membuka `https://www.google.com/maps/search/?api=1&query=<encoded address>`.
2. **Update Status Penjemputan** — dropdown 7 stage:
   - Idle → Driver Berangkat → Tiba di Lokasi → Mobil Dijemput → Tiba di Bengkel → (jika antar) Mengantar Pulang → Selesai Diantar.
   - Setiap perubahan dicatat ke `booking_status_logs` (re-use tabel existing dengan prefix `pickup:`).
3. **Catat Serah-Terima** — modal dengan:
   - Input odometer (start saat dijemput / end saat dikembalikan).
   - Upload foto multi (min 2, max 8) ke bucket `pickup-handover`.
   - Disimpan ke `pickup_handover_photos` + odometer fields.
4. **Hubungi Customer (WA)** — tombol cepat ke `wa.me/<phone>?text=...` (sudah ada pattern di project).
5. **Assign Driver** (opsional v2) — placeholder dropdown staff; v1 cukup field text bebas.

---

## 5) Tampilan customer

- Di `/my-booking/:id` & live progress tracker:
  - Tampilkan section **Status Penjemputan** dengan stepper 4–7 stage (mirroring `pickup_status`).
  - Tampilkan biaya jemput pada rincian invoice.
- Invoice (`InvoiceView`) menambahkan line item "Biaya Jemput" & "Biaya Antar" jika ada.

---

## 6) RLS

- Kolom baru otomatis terlindungi oleh policy `bookings` existing (user own / staff all).
- Bucket `pickup-handover`:
  - Staff: read/write semua.
  - Customer: read foto pada booking miliknya saja (path `<booking_id>/...`).

---

## Catatan teknis (untuk referensi)

- Pakai pattern InfoDot/Popover (compact) untuk badge pick-up agar tidak ramai.
- Status dropdown re-use komponen `Select` + log helper yang sudah dipakai untuk `service_status`.
- Fee dihitung di **client saat submit** + **divalidasi ulang via DB trigger** (opsional v2) untuk cegah manipulasi.
- Edge function `midtrans-create-cart-checkout` perlu menambah pickup_fee ke `gross_amount` jika user bayar online.

---

## Out-of-scope (v1)

- Integrasi Google Maps untuk autocomplete & jarak otomatis.
- Penugasan multi-driver dengan tracking real-time GPS.
- Per-km pricing (struktur sudah disiapkan via `fee_mode`).
