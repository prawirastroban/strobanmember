## Tentang tampilan versi web

Web view bisa dilihat di salah satu URL berikut (semuanya sama, hanya beda environment):
- Preview (live editing): `https://id-preview--b619a7db-c469-4218-9af2-5982392d5c82.lovable.app/dashboard/bookings`
- Published: `https://strobanmember.lovable.app/dashboard/bookings`
- Domain produksi: `https://www.bengkelstroban.com/dashboard/bookings`

Sekarang Anda sedang berada di `/dashboard/bookings` di preview (viewport 1370px → tampilan desktop aktif, bukan mobile).

## Masalah tampilan saat ini (desktop)

`BookingsManager.tsx` memakai `<Table>` 9 kolom yang berisi banyak elemen interaktif (3 tombol besar bertumpuk, 2 Select payment, dropdown status, PickupActions, tombol Owner). Akibatnya:
- Kolom "Actions" sangat tinggi & padat — sulit memindai mana action paling penting.
- Setiap baris bisa setinggi 250–350px → 1 layar hanya muat 2–3 booking.
- Primary CTA (Confirm / Check-In / Mulai Dikerjakan / Bayar Sekarang) tenggelam di tengah tumpukan.
- Badge prioritas, badge status, badge payment, badge pickup tersebar di 3 kolom berbeda.
- Catatan pelanggan (amber box) memperlebar kolom Service.

## Rencana perbaikan (UI-only, tanpa ubah logic)

Tetap pakai data & handler yang sama. Hanya ubah render tab "All Bookings" desktop di `BookingsManager.tsx`.

### 1. Ganti `<Table>` → grid kartu kompak

Layout per row (kartu horizontal, padding `p-3`, tinggi target ~120–140px):

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [PRIO] [STATUS] [PAY] [PICKUP]   ⏰ 18 Mei 2026 · 14:00      [⋯ Owner menu] │
│ ─────────────────────────────────────────────────────────────────────────── │
│ 👤 Budi Santoso              🚗 Avanza · B 1234 ABC    🔧 Tune Up Mesin    │
│    0812-...  · Dibuat: Staff    Cabang: Cipulir                              │
│    💬 "Tolong cek rem juga"  (1 baris, klik untuk expand)                    │
│ ─────────────────────────────────────────────────────────────────────────── │
│ [PRIMARY CTA ex: Confirm Booking]   [Status ▾] [Metode ▾] [Bayar ▾]  [Pickup]│
└──────────────────────────────────────────────────────────────────────────────┘
```

Keunggulan:
- 1 layar muat 5–7 booking.
- Primary CTA (1 tombol kontekstual) selalu di pojok kiri-bawah → admin tahu langkah berikutnya tanpa berpikir.
- Semua badge dirangkum di header kartu.

### 2. Aturan "Primary CTA" (satu tombol per kartu)

Pilih action paling relevan berdasarkan state — sisanya disembunyikan di menu `⋯ Lainnya`:
- `cancel_requested && status!='cancelled'` → "Setujui Pembatalan" (merah)
- `payment_status` belum paid & status pre-confirm → "Bayar Sekarang"
- `waiting_confirmation`/`pending` & sudah bayar → "Confirm Booking" (hijau pulse)
- `confirmed` → "Check-In"
- `checked_in` → "Mulai Dikerjakan"
- `in_progress` → "Selesaikan"
- selainnya → tidak ada primary, hanya Select status.

Tombol "Tolak Pembatalan", PickupActions, Owner Edit/Delete dipindah ke menu titik tiga di kanan-atas kartu agar tidak crowded.

### 3. Group header per tanggal

Sebelum render daftar, group `filtered` berdasarkan `booking_date` dan tampilkan sticky header tipis:
`Hari ini · 18 Mei 2026 (3)` / `Besok · 19 Mei (5)` / `27 Mei 2026 (2)`.
Memudahkan admin memproses per hari kerja.

### 4. Highlight visual berdasarkan urgensi

- Border kiri 3px: merah (high priority / overdue), kuning (medium), abu (low).
- Background lembut `bg-red-500/5` hanya untuk overdue konfirmasi (sudah ada, dipertahankan).
- Animasi pulse hanya pada kartu `waiting_confirmation` + payment ready.

### 5. Catatan pelanggan jadi inline 1-baris + Popover

Saat ini box amber memakan tinggi. Diubah jadi:
`💬 "Tolong cek rem..." [i]` — klik ikon i tampilkan Popover berisi full text.
Konsisten dengan memory `compact-info-popup`.

### 6. Mobile (`<md`)

Tidak diubah — `MobileBookingRow` sudah cukup rapi.

### 7. Tab "Sedang Dikerjakan"

Diberi treatment yang sama (kartu kompak) agar konsisten, tapi tanpa kolom payment (karena pasti sudah paid).

## Detail teknis

File yang disentuh: hanya `src/components/admin/BookingsManager.tsx` (UI-only).

Tidak mengubah: data fetching, RLS, edge functions, tipe Booking, handler `confirmBooking` / `updateStatus` / `setPaymentStatus` / `approveCancellation` / `rejectCancellation` / Pickup. Semua dipanggil dari komponen kartu baru.

Komponen baru (inline di file yang sama supaya tetap fokus presentasi):
- `BookingCard` — render 1 kartu + memilih primary CTA.
- `DateGroupHeader` — sticky `top-0 z-10 bg-background/95 backdrop-blur` dengan label tanggal + count.

Tidak menambah dependency baru. Pakai komponen shadcn yang sudah ada (`Card`, `Badge`, `Button`, `DropdownMenu`, `Popover`, `Select`).

Token warna tetap pakai semantic tokens (`bg-card`, `border-border`, `text-muted-foreground`, `bg-primary/10`, dll) sesuai design system.
