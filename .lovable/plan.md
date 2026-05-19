# Review & Perbaikan /dashboard/feedback (Pusat Kontrol Operasional)

Hasil review `FeedbackControlCenter.tsx`, `useFeedbackFeed.ts`, dan `feedbackPriority.ts`. Ditemukan beberapa bug fungsional dan masalah privasi cabang yang perlu diperbaiki.

## Temuan & Perbaikan

### 1. 🔒 Privasi: Admin Cabang melihat data semua cabang
**Masalah:** Tabel `customer_complaints`, `internal_reports`, `booking_reviews`, `payments` tidak punya kolom `branch`. Di `feedbackPriority.ts` semua item di-set `branch: null`. Filter `if (fBranch !== "all" && i.branch && …)` membiarkan item ber-`branch=null` lolos → Admin Cabang yang ter-lock cabangnya tetap melihat keluhan/bug dari cabang lain.

**Fix:**
- `useFeedbackFeed`: tarik mapping `booking_id → branch` dari tabel `bookings`, lalu enrich item `complaint`/`review`/`payment` yang punya `booking_id`. Untuk `internal` (tidak punya booking) tetap null.
- Filter cabang: jika `isLocked`, item dengan `branch=null` (selain `internal`) di-drop, atau ditandai "Tanpa cabang" dan disembunyikan dari Admin Cabang. Untuk staff/CS Pusat tetap tampil.

### 2. 🐛 Counter tab "urgent" dobel-hitung
**Masalah:** Payment & booking-stuck selalu `priority: kritis|tinggi` **dan** `tab: "urgent"`. Loop counter menambah `c.urgent++` lewat cabang prioritas, lalu `c[i.tab]++` (yang sama dengan urgent) → counter urgent dihitung 2× untuk payment/booking.

**Fix:** Gunakan `else if (i.tab === "urgent") c.urgent++; else c[i.tab]++;` agar setiap item hanya menambah satu counter.

### 3. 🐛 Filter Status tidak konsisten
**Masalah:** Dropdown punya opsi `new` / `open` / `in_progress` / `resolved` / `fixed`, tapi tiap source pakai vocab berbeda (`complaint`: new/in_progress/resolved; `internal`: open/in_progress/fixed; `review`: completed/pending; `payment`: pending/failed). Memilih "Open" hanya cocok untuk internal.

**Fix:** Ganti opsi jadi makna semantik gabungan:
- "Belum Selesai" → semua status kecuali resolved/fixed/completed
- "Sedang Diproses" → `in_progress`
- "Selesai" → resolved/fixed/completed
- "Baru" → new/open/pending(review)

### 4. 🐛 Tombol "Tandai Selesai" muncul untuk semua user, tapi gagal untuk internal jika bukan staff
**Masalah:** `markResolved` baru mengecek `isStaff` di runtime → user non-staff dapat toast error setelah klik.

**Fix:** Sembunyikan opsi "Tandai Selesai" untuk item `internal` kalau bukan staff. Untuk source `payment`/`booking` (auto-resolve), ganti label menjadi info "Otomatis hilang setelah selesai" + disable.

### 5. 🐛 Realtime tidak mendengarkan tabel `bookings`
**Masalah:** Saat status booking berubah, item "Booking stuck" tidak hilang sampai user manual refresh.

**Fix:** Tambah subscribe `bookings` di `useFeedbackFeed`.

### 6. 🎨 UX: Tidak ada Reset Filter, indikator filter aktif, atau tombol Export
Halaman ini adalah laporan operasional tapi tanpa export — tidak konsisten dengan Reports Hub. Filter aktif juga sulit dilihat.

**Fix:**
- Tambah tombol "Reset Filter" yang muncul saat ada filter selain default.
- Tambah counter "X dari Y laporan" di atas list.
- Tambah tombol "Export Excel" (CSV) untuk daftar `visible`, kolom: Waktu, Prioritas, Sumber, Cabang, Customer, Judul, Status.

### 7. 🎨 Empty state lebih jelas
Kalau `kpi.total = 0` saat first load, tampilkan empty state ramah ("Belum ada laporan masuk") alih-alih "Tidak ada laporan untuk filter ini".

## File yang Disentuh
- `src/hooks/useFeedbackFeed.ts` — enrich branch dari bookings, subscribe bookings.
- `src/lib/feedbackPriority.ts` — propagate `branch` lewat fungsi `scoreComplaint/scoreReview/scorePaymentAnomaly` (terima param branch).
- `src/components/admin/feedback/FeedbackControlCenter.tsx` — perbaiki counter, filter status, scope lock branch, hide resolve untuk non-staff, tambah Reset + Export, empty state.

## Yang TIDAK diubah
- Skema DB (tidak perlu migration).
- Layout KPI cards, tabs, dan detail sheet (sudah baik).
- Algoritma prioritas (scoring rumus tetap).
