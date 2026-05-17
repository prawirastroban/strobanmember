## Tujuan
Rombak `/dashboard/feedback` (saat ini hanya daftar bug internal) menjadi **Pusat Kontrol Operasional** — satu dashboard yang menggabungkan keluhan customer, laporan internal, anomali pembayaran/booking, dan rating buruk, dengan prioritas otomatis, realtime, dan analytics.

## Sumber Data (tabel yang sudah ada — tidak buat tabel baru)
- `customer_complaints` — keluhan customer
- `internal_reports` — bug / revisi / masukan staff
- `bookings` — deteksi booking stuck, lonjakan cancel, keterlambatan
- `payments` + `manual_payment_proofs` — payment pending lama, webhook gagal, mismatch
- `booking_reviews` — rating buruk (≤2 bintang)
- `booking_status_logs` — timeline & deteksi tidak bergerak

Semua tabel sudah ber-RLS dengan scoping `admin_cabang` via `is_admin_cabang_for(branch)` → role access otomatis terhormati.

## Arsitektur Halaman

```
/dashboard/feedback  (FeedbackControlCenter.tsx)
├─ Header: judul + tombol "Lapor Internal" (existing dialog)
├─ KPI Strip (4 kartu): Kritis | Tinggi | Belum Selesai | Avg Resolution
├─ Tabs:
│   1. Masalah Mendesak   (kritis + tinggi, auto-detected + manual)
│   2. Feedback Customer  (customer_complaints + low rating reviews)
│   3. Kendala Operasional (internal_reports kategori bug/revisi + booking/payment anomaly)
│   4. Saran & Pengembangan (internal_reports kategori masukan + saran customer)
├─ FilterBar: prioritas, cabang, status, jenis, tanggal, search
└─ List kartu unified (UnifiedReportCard) sorted by priorityScore desc
```

## Model Unified Item (di memory, bukan DB)
```ts
type UnifiedItem = {
  id, source: 'complaint'|'internal'|'payment'|'booking'|'review'|'auto',
  title, customerName?, branch?, category, status, createdAt,
  priority: 'kritis'|'tinggi'|'sedang'|'rendah',
  priorityScore: number, // untuk sort
  raw: any, bookingId?, paymentId?, userId?
}
```

## Sistem Prioritas Otomatis
Helper `lib/feedbackPriority.ts` menghitung skor:

| Kondisi | Level | Skor |
|---|---|---|
| Payment pending > 24 jam, atau webhook fail | KRITIS | 100 |
| Booking stuck (status sama > 48 jam, belum done) | KRITIS | 95 |
| Komplain kategori "pembayaran"/"kerusakan" status=new | KRITIS | 90 |
| Manual payment proof menunggu review > 6 jam | TINGGI | 80 |
| Review rating ≤ 2 | TINGGI | 75 |
| Komplain berulang dari user yang sama (≥2 dalam 7 hari) | TINGGI | 70 |
| Internal report kategori "bug" status=open | TINGGI | 65 |
| Komplain umum status=new | SEDANG | 50 |
| Internal "revisi" | SEDANG | 40 |
| Internal "masukan" / saran | RENDAH | 20 |
| +bonus untuk usia laporan (semakin lama belum selesai, skor naik) | | +0..20 |

Auto-detection alerts ditambahkan sebagai item virtual (source='auto') saat fetch — tidak disimpan ke DB di plan ini (cukup dihitung client-side dari `bookings` & `payments`).

## Komponen Baru
- `src/pages/DashboardFeedback.tsx` (entry route, override route lama yang pakai `InternalReports`)
- `src/components/admin/feedback/FeedbackControlCenter.tsx` — orchestrator
- `src/components/admin/feedback/FeedbackKPIStrip.tsx`
- `src/components/admin/feedback/FeedbackFilters.tsx`
- `src/components/admin/feedback/UnifiedReportCard.tsx` — kartu dengan badge prioritas (merah/oranye/kuning/abu), tombol aksi (Lihat Detail, Buka Booking, Buka Pembayaran, Tugaskan, Tandai Selesai, Eskalasi)
- `src/components/admin/feedback/FeedbackDetailSheet.tsx` — slide-over: detail, screenshot, data booking/payment terkait, timeline `booking_status_logs`, histori komplain customer
- `src/components/admin/feedback/FeedbackAnalytics.tsx` — section bawah: cabang paling bermasalah, komplain terbanyak, rata-rata waktu selesai, trend kepuasan (recharts)
- `src/lib/feedbackPriority.ts` — pure helper skoring
- `src/hooks/useFeedbackFeed.ts` — gabungkan 5 query paralel + realtime subscribe ke 4 tabel + dedupe + sort

## Realtime
Single hook subscribe ke channel "feedback-hub" dengan listener untuk: `customer_complaints`, `internal_reports`, `payments`, `booking_reviews`. Re-fetch + re-score saat event.

## Aksi Tombol
- "Tandai Selesai" → update `status` di tabel sumber (`customer_complaints.status='resolved'`, `internal_reports.status='fixed'` (owner only), dst.)
- "Tugaskan Staff" → simpan ke `admin_note` / `metadata` (gunakan kolom yang sudah ada)
- "Eskalasi" → set priority manual override di `metadata` JSON
- "Buka Booking" / "Buka Pembayaran" → navigate ke halaman terkait
- "Lihat Riwayat Customer" → buka `CustomerDetail` existing

Tidak butuh perubahan skema DB untuk MVP. Jika nanti perlu assignment persisten, baru tambah kolom — out of scope plan ini.

## Role Access
Pakai `useUserRole`:
- `isStaff` (Owner) / `isAdmin` (CS) → semua data
- `isAdminCabang` → RLS otomatis hanya mengembalikan baris cabangnya (untuk `bookings`/`payments`). Untuk `customer_complaints` & `internal_reports` (yang tidak punya kolom `branch`), filter client-side: hanya tampilkan complaint yang user_id-nya pernah booking di cabangnya, internal_reports hanya yang reporter di cabangnya.
- `isCustomer` → blokir halaman (sudah ada guard di `AdminRoute`).

## Mobile View
- Tabs scrollable horizontal
- KPI strip 2x2 grid di mobile
- Kartu full-width, action buttons dalam dropdown menu "•••"
- FilterBar collapse ke Sheet bottom

## Tema Visual
Merah premium konsisten dengan brand (#ff2b2b):
- Badge KRITIS: bg-red-500/15 border-red-500/40 text-red-400 + glow
- TINGGI: amber, SEDANG: yellow, RENDAH: muted
- Card: liquid glass (sesuai design system existing)

## Route
`src/App.tsx`: route `/dashboard/feedback` saat ini render `InternalReports` di dalam `AdminLayout`. Ganti element menjadi `DashboardFeedback`. Komponen `InternalReports` lama tetap dipakai sebagai sub-section "Lapor Internal" (modal trigger) untuk backward compat.

## Out of Scope
- Skema DB baru / kolom assignment baru
- Edge function baru
- Push notification untuk alert (gunakan notifikasi bell yang sudah ada saja)
- Persistensi auto-detected alerts (cukup dihitung on-the-fly)

## Estimasi
~6-8 file baru, 1 file route diubah, tanpa migrasi DB. Implementasi 1 prompt panjang.
