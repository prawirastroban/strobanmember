# Plan: "Action Needed" Filter + Priority Sort di Semua Menu Admin

## Tujuan
Setiap menu di Dashboard yang membutuhkan tindakan staff/admin harus:
1. Memunculkan **chip filter "Perlu Aksi"** di FilterBar.
2. **Otomatis menyortir** baris yang belum diproses ke **paling atas** (sebelum sort default lain).
3. Menampilkan **badge "Perlu Aksi"** kecil di kolom status agar mudah dikenali.
4. Sinkron dengan badge angka merah di sidebar (sumber hitungan sama).

## Definisi "Perlu Aksi" per Menu

| Menu | File | Kondisi "Perlu Aksi" |
|---|---|---|
| Bookings | `BookingsManager.tsx` | `status IN ('pending','waiting_confirmation')` ATAU `cancel_requested = true` |
| Payments | `PaymentsManager.tsx` | `payment_status IN ('pending','unpaid')` |
| Complaints | `ComplaintsManager.tsx` | `status = 'new'` |
| User Verification | `UserVerification.tsx` | `is_verified = false` |
| Tire Orders (jika ada di TransactionHistory) | `TransactionHistory.tsx` | `status = 'pending'` atau `payment_status = 'unpaid'` |
| Rewards Redemptions (opsional) | dalam `LoyaltyPointsManager` | `status = 'active'` & code belum digunakan — **tidak diubah** kecuali user minta |

> Customer List, Promos, Services, Tires, Branches, Slots, Branding → **tidak ada konsep "perlu aksi"**, di-skip.

## Implementasi

### 1. Helper baru: `src/lib/actionNeeded.ts`
Satu file kecil berisi:
- `type ActionScope = 'booking' | 'payment' | 'complaint' | 'verification' | 'tire_order'`
- `isActionNeeded(scope, row): boolean` — logika sesuai tabel di atas.
- `actionPriority(scope, row): number` — `0` = perlu aksi, `1` = lainnya. Dipakai sebagai sort primer.
- `ACTION_BADGE_CLASS` — style badge merah pulse seragam.

### 2. Update FilterBar consumer (4 file)
Pada `BookingsManager`, `PaymentsManager`, `ComplaintsManager`, `UserVerification`:
- Tambahkan state `onlyActionNeeded: boolean` (default `false`).
- Tambah satu chip baru di awal array `chips` FilterBar:
  ```
  { key: 'action_needed', label: '⚡ Perlu Aksi', active: onlyActionNeeded,
    onClick: () => setOnlyActionNeeded(v => !v), count: actionNeededCount }
  ```
  `count` diisi dari hasil filter dataset (real-time).
- Saat `onlyActionNeeded=true`, dataset di-filter `isActionNeeded(...)`.
- Saat `false`, dataset tetap **di-sort dulu** dengan `actionPriority` lalu sort default (tanggal terbaru). Jadi item perlu aksi tetap muncul di atas tanpa harus klik filter.
- Tambah badge "⚡ Perlu Aksi" di samping kolom Status untuk row yang `isActionNeeded`.
- `UserVerification` saat ini tidak pakai FilterBar — akan dipasang FilterBar mini (search + chip "Perlu Aksi" saja) agar konsisten.

### 3. Reset filter
`onReset` di tiap manager juga set `onlyActionNeeded=false`.

### 4. Konsistensi sidebar
Sumber hitung di `AdminSidebar.tsx` sudah memakai kondisi yang sama (pending bookings, new complaints, pending payments, unverified users). Tidak ada migrasi DB.

## Catatan
- Tidak ada perubahan schema Supabase.
- Tidak ada perubahan di halaman customer-facing.
- Mobile-friendly: chip baru otomatis ikut layout `overflow-x:auto` FilterBar yang ada.

## Files yang akan diubah
- **Baru**: `src/lib/actionNeeded.ts`
- **Edit**: `src/components/admin/BookingsManager.tsx`
- **Edit**: `src/components/admin/PaymentsManager.tsx`
- **Edit**: `src/components/admin/ComplaintsManager.tsx`
- **Edit**: `src/components/admin/UserVerification.tsx`
- **Edit** (jika perlu): `src/components/admin/TransactionHistory.tsx`
