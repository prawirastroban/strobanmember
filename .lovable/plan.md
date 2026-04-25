# Gabung Popup Keluhan Guest ke Konsultasi AI

## Masalah saat ini

Ada **2 fitur yang tumpang tindih** untuk menangkap data kendaraan + keluhan:

| Fitur | Lokasi | Output |
|---|---|---|
| **Popup guest** di Hero booking form | `HeroBookingForm.tsx` (mobile) | Simpan ke `vehicle_complaints` saja — tanpa AI, tanpa rekomendasi |
| **Konsultasi AI** | `PopularServices.tsx` (mobile, section "Konsultasi Online") | AI diagnosa + rekomendasi servis + tombol booking + simpan ke `vehicle_complaints` |

Keduanya minta data yang sama (brand, model, tahun, transmisi, KM, keluhan). User ketik 2x, staff lihat data ganda di dashboard. Konsultasi AI lebih kuat karena langsung kasih jawaban + rekomendasi.

## Solusi: jadikan Konsultasi AI satu-satunya entry point

```text
                BEFORE                                  AFTER
   ┌─────────────────────────┐            ┌───────────────────────────┐
   │  Hero booking form      │            │  Hero booking form        │
   │  → tap "Kendaraan"      │            │  → tap "Kendaraan"        │
   │  → popup form keluhan   │            │  → (member) sheet pilih   │
   │    (manual save only)   │            │    kendaraan tersimpan    │
   └─────────────────────────┘            │  → (guest) login dialog   │
                                          │    + tombol "Konsultasi"  │
   ┌─────────────────────────┐            └───────────────────────────┘
   │  Konsultasi Online      │            ┌───────────────────────────┐
   │  → form + AI chat       │            │  Konsultasi Online        │
   │  → rekomendasi + book   │            │  → form + AI chat         │
   └─────────────────────────┘            │  → rekomendasi + booking  │
                                          │  ★ satu-satunya tempat    │
                                          │    untuk keluhan          │
                                          └───────────────────────────┘
```

## Yang akan diubah

### 1. `src/components/mobile/home/HeroBookingForm.tsx`
- **Hapus** dialog form merk/tipe/tahun/keluhan untuk guest (baru saja dibuat) — semua state `guestForm`, `BRAND_MODELS`, `submitGuestDetail`.
- **Hapus** import yang tidak dipakai lagi: `Dialog`, `Textarea`, `Label`, `useToast`, `supabase`.
- Saat guest tap "Kendaraan":
  - Tampilkan **bottom sheet ringan** dengan 2 pilihan jelas:
    1. **"Saya sudah tahu layanan yang dibutuhkan"** → buka login dialog (alur booking lama).
    2. **"Saya ingin konsultasi keluhan dulu"** → scroll smooth ke section Konsultasi Online di bawah dan auto-pilih tab "Keluhan".
- Member yang login: tetap pakai sheet pilih kendaraan tersimpan (tidak berubah).

### 2. `src/components/mobile/home/PopularServices.tsx` (Konsultasi)
- Tambah `id="konsultasi"` pada `<section>` agar bisa di-scroll dari hero.
- Expose mekanisme untuk **set mode dari luar** via URL hash atau custom event:
  - Listen `window` event `"open-konsultasi"` dengan detail `{ mode: "complaint" | "search" }` → set mode + scroll into view + focus textarea.
- **Polish form data kendaraan** agar konsisten dengan dummy brand/model yang sudah dipakai:
  - Ganti input bebas Brand & Model menjadi 2 dropdown (Brand → Model) memakai katalog `BRAND_MODELS` (Toyota, Daihatsu, Honda, …, Lainnya) — pengguna lebih cepat dan data lebih bersih untuk staff.
  - Tetap sediakan input bebas saat pilih "Lainnya".
  - Tahun jadi dropdown (current year → 2005), bukan input numeric bebas.

### 3. Keuntungan yang didapat

- **1 sumber data keluhan** → `vehicle_complaints` tidak dobel, dashboard lebih bersih.
- Guest dapat **AI diagnosa + rekomendasi servis** + langsung tombol booking, bukan sekadar form simpan.
- Hero booking form lebih ringan & fokus untuk user yang sudah tahu mau apa.
- Konsisten data kendaraan (brand/model dropdown) → memudahkan filter & analisis di "Keluhan Kendaraan".

## Yang TIDAK berubah

- Schema database `vehicle_complaints` & `booking_slots` — tidak perlu migration.
- Edge function `service-consultation` — tetap sama, sudah handle complaint logging.
- Routing, RLS, alur pembayaran, struktur komponen lain.
- Member experience untuk pilih kendaraan tersimpan di hero form.
- Dashboard panel "Keluhan Kendaraan" — tetap sumber data yang sama.

## File yang disentuh

- `src/components/mobile/home/HeroBookingForm.tsx` — hapus popup guest, ganti dengan sheet 2 opsi yang trigger event ke Konsultasi.
- `src/components/mobile/home/PopularServices.tsx` — listen event, scroll/focus, upgrade form ke dropdown brand/model/tahun.
