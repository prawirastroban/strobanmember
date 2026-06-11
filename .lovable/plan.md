## Audit Halaman Existing

| Halaman | Komponen | Fungsi utama | Yang harus DIPERTAHANKAN |
|---|---|---|---|
| `/dashboard/history` | `TransactionHistory.tsx` (364 baris) | List booking + status bayar, filter, search, pagination, Invoice link, TransferProofButton | Filter, search, role scoping |
| `/dashboard/keuangan/payment` | `PaymentsManager.tsx` (805 baris) | List payment, **Confirm/Reject manual transfer**, **Sync Midtrans**, lihat bukti transfer, dialog detail booking, WA customer | **Semua aksi admin di atas — KRITIS, jangan hilang** |

Duplikasi sebenarnya: list transaksi + filter dasar. Yang **tidak duplikat** adalah aksi admin di PaymentsManager (verify/reject/sync) — wajib tetap ada.

## Strategi Konsolidasi (aman, tanpa hapus)

1. Jadikan `/dashboard/history` sebagai **Unified History Hub** ber-tab.
2. Tab "Payments" me-mount ulang `PaymentsManager` apa adanya → semua fitur admin tetap utuh.
3. `/dashboard/keuangan/payment` **TIDAK dihapus** — diberi banner "Pindah ke History → tab Payments" + tetap berfungsi sebagai fallback sampai user setuju menghapus menu.
4. Setelah Anda verifikasi semua fitur jalan di History, baru kita hapus item menu sidebar (rute tetap aktif untuk bookmark lama, redirect ke `/dashboard/history?tab=payments`).

## Struktur Baru `/dashboard/history`

```text
[ Header: "Pusat Histori" + Quick Insight strip ]
  Hari Ini: 12 Booking · Rp 4.250.000 · 3 Promo · 1 Loyalty · 0 Referral

[ Global Filter Bar ]  (sticky di atas tab)
  Search global (booking#, invoice#, nama, plat, HP)
  Timeline · Cabang · Customer · Kendaraan · Status Booking · Status Bayar
  · Promo · Referral · Loyalty · Metode Bayar · [Reset] [Simpan Preset]

[ Tabs ]
  ┌ Bookings   (default)
  │ Payments
  │ Promo
  │ Loyalty
  │ Referral
  │ Service
  └ Aktivitas (timeline gabungan)
```

### Section ↔ Tab mapping

| # | Section | Lokasi |
|---|---|---|
| 1 | Booking History | Tab **Bookings** (table+kartu mobile) |
| 2 | Payment History | Tab **Payments** → render `PaymentsManager` |
| 3 | Promo History | Tab **Promo** |
| 4 | Loyalty History | Tab **Loyalty** |
| 5 | Referral History | Tab **Referral** |
| 6 | Service History | Tab **Service** |
| 7 | Transaction Timeline | **Drawer detail** ketika klik baris booking + Tab **Aktivitas** (feed lintas data) |
| 8 | Financial Summary | Drawer detail booking |
| 9 | Receipt & Document | Drawer detail booking (Lihat Invoice, Download PDF, Lihat Bukti, Download Bukti) |
| 10 | Advanced Filter | Global Filter Bar |
| 11 | Search global | Search di Global Filter Bar |
| 12 | Quick Insight | Strip di header |

### Detail per tab

**Tab Bookings** — Kolom: Kode (#ABCD), QR (popover), Customer, Kendaraan, Cabang, Layanan, Tanggal, Status. Klik baris → buka **Detail Drawer**.

**Tab Payments** — `<PaymentsManager />` (no rewrite). Filter bar atas dihormati via context (lihat di bawah).

**Tab Promo** — Sumber: `bookings` join `promo_claims` + `promos`. Kolom: Promo, Diskon, Customer, Booking #, Cabang.

**Tab Loyalty** — Sumber: `loyalty_transactions` + `reward_redemptions`. Kolom: Tipe (earn/redeem), Point, Nilai (Rp utk redeem), Tanggal, Customer.

**Tab Referral** — Sumber: `referral_commissions`. Kolom: Referrer, Referee, Booking, Status, Reward.

**Tab Service** — Sumber: `bookings` selesai/completed. Kolom: Layanan, Kendaraan, Cabang, Teknisi (jika ada), Status.

**Tab Aktivitas** — Feed kronologis lintas tabel (booking created, payment paid, promo used, loyalty earned, referral granted). Sumber: `activity_logs` + derive dari tabel di atas.

### Detail Drawer (klik baris booking)

```text
┌─────────────────────────────────────────┐
│ #BK-0001  ·  Status: Completed  · ✕    │
├─────────────────────────────────────────┤
│ Customer · Kendaraan · Cabang           │
│                                         │
│ Section 7 — TIMELINE                    │
│  08:15 Booking Dibuat                   │
│  08:30 Dikonfirmasi (staff: …)          │
│  09:00 Check-In                         │
│  09:15 Pembayaran DP (Rp …)             │
│  10:45 Servis Selesai                   │
│  11:00 Pelunasan                        │
│                                         │
│ Section 8 — FINANCIAL SUMMARY           │
│  Gross           Rp 600.000             │
│  (-) Promo       Rp  60.000             │
│  (-) Loyalty     Rp       0             │
│  (-) Referral    Rp       0             │
│  (-) Manual      Rp       0             │
│  Net             Rp 540.000             │
│                                         │
│ Section 9 — RECEIPT & DOCUMENT          │
│  [Lihat Invoice] [Download PDF]         │
│  [Lihat Bukti Bayar] [Download Bukti]   │
└─────────────────────────────────────────┘
```

Timeline disusun dari: `bookings.created_at/queue_set_at/pickup_dispatched_at/.../completed`, `payments.created_at + payment_status`, `booking_status_logs`.

## Role-based Visibility

| Role | Bookings | Payments | Promo | Loyalty | Referral | Service |
|---|---|---|---|---|---|---|
| Customer | own only | own only | own only | own only | own only | own only |
| Staff / Admin Cabang | scoped to branch | scoped | scoped | scoped | scoped | scoped |
| Finance / Super Admin / Owner | all | all (incl. verify/reject) | all | all | all | all |

Aksi verify/reject di tab Payments tetap mengikuti permission yang sudah ada di `PaymentsManager` (tidak diubah).

## Implementasi Bertahap

**Phase A — Build (tanpa hapus apa pun)**
1. New file `src/pages/HistoryHub.tsx` (atau `src/components/admin/HistoryHub.tsx`).
2. New folder `src/components/admin/history/`:
   - `HistoryFilterBar.tsx` — global filter + search.
   - `HistoryFilterContext.tsx` — React context (timeline/branch/customer/vehicle/promo/etc) dipakai semua tab.
   - `QuickInsightStrip.tsx` — hari ini KPI.
   - `tabs/BookingsTab.tsx`
   - `tabs/PromoTab.tsx`
   - `tabs/LoyaltyTab.tsx`
   - `tabs/ReferralTab.tsx`
   - `tabs/ServiceTab.tsx`
   - `tabs/ActivityTab.tsx`
   - `BookingDetailDrawer.tsx` (Timeline + Financial Summary + Receipt buttons).
3. Update `src/pages/Admin.tsx`: ganti `<TransactionHistory />` → `<HistoryHub />` di route `history`. **TransactionHistory.tsx tetap ada** sebagai fallback (tidak dihapus, tidak diimport).
4. Reuse `PaymentsManager` di tab Payments — tanpa modifikasi.

**Phase B — Customer access**
- Tambah route customer `/history` (atau pakai existing `ServiceHistory.tsx` sebagai entry) yang me-mount HistoryHub mode "self-only".
- HistoryHub menerima prop `scope: "self" | "branch" | "all"` dihitung dari `useUserRole()`.

**Phase C — Cleanup (menunggu approval Anda)**
- Hilangkan item sidebar "Payments" → ganti deep-link ke `/dashboard/history?tab=payments`.
- `/dashboard/keuangan/payment` tetap berfungsi (redirect ke history) atau dipertahankan sesuai keputusan Anda.
- `TransactionHistory.tsx` dihapus setelah HistoryHub stabil.

## Mobile UX

- Filter bar collapse jadi tombol "Filter (N)" → bottom-sheet.
- Tab horizontal scroll.
- List = card expandable (tap → expand inline timeline + tombol invoice).

## Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Aksi verify manual transfer hilang | `PaymentsManager` di-mount apa adanya di tab Payments |
| Filter terlalu banyak bikin query lambat | Filter chain server-side + debounce 350ms (sudah ada pola di kedua komponen) |
| Customer melihat data orang lain | Scope `self` di Phase B + RLS existing |
| Bookmark lama ke `/keuangan/payment` mati | Rute tetap hidup; redirect baru opsional |

## Pertanyaan Approval

1. **Customer entry point** — bikin route baru `/history` (mobile-friendly), atau cukup integrasikan ke `ServiceHistory.tsx` existing?
2. **Tab default** — Bookings (saya rekomendasi) atau "Aktivitas" feed gabungan?
3. **Hapus item sidebar "Payments"** sekarang (deep-link saja) atau biarkan dulu sampai Anda verifikasi tab Payments di History?
4. **Tab "Service" vs "Bookings"** — mereka mirip. Service = booking status=completed saja, oke?
