## Tujuan

Tingkatkan alur follow-up review pelanggan dari bengkel: WhatsApp tetap jadi titik sentuh utama, tapi pelanggan punya **link review web** yang langsung tersinkron ke database. Admin tetap bisa **input ulang manual** kalau pelanggan balas via teks WA. Lalu tambahkan laporan review pelanggan di **/dashboard/reports/customers**.

## Alur Hybrid yang Dibangun (opsi D)

```
Booking selesai
    ↓
Admin klik tombol "WA" di Follow-up Review Panel
    ↓
Buka WA dengan template berisi:
  • Sapaan + nama service
  • Link unik web review: https://bengkelstroban.com/review/{token}
  • Petunjuk singkat ("balas pesan ini juga boleh")
    ↓
┌───────────────────────────┬─────────────────────────────┐
│ Jalur 1 (utama)           │ Jalur 2 (fallback)          │
│ Pelanggan klik link       │ Pelanggan balas teks di WA  │
│  → isi rating & catatan   │  → admin baca, klik         │
│  → tersimpan otomatis     │     "Input Review" untuk    │
│     ke booking_reviews    │     mencatat manual         │
│  → muncul real-time di    │                             │
│     panel (badge ✅)      │                             │
└───────────────────────────┴─────────────────────────────┘
    ↓
Semua data masuk satu tabel: booking_reviews
    ↓
Tersedia di /dashboard/reports/customers (kategori "Pelanggan (CRM)")
```

## Perubahan UI/UX

**Template WhatsApp baru** (`ReviewFollowUpPanel.openWhatsApp`):
- Sapaan personal + nama layanan + cabang
- Tautan unik: `{base}/review/{review_submission_token}` (token sudah ada di DB)
- Penjelasan opsi: "Klik link untuk isi cepat (1 menit), atau balas pesan ini langsung"
- Tanda tangan brand "Sahabat Stroban Service"

**Tombol & badge**:
- Badge "📩 Sudah dijawab pelanggan" yang sudah ada tetap dipakai → jadi indikator otomatis bahwa balasan sudah masuk via web (sinkron real-time melalui Supabase channel `booking_reviews`).
- Tombol **WA** = kirim template + link
- Tombol **Input Review** = fallback bila pelanggan balas via teks WA

**Pastikan token tersedia** sebelum kirim WA: kalau `review_submission_token` masih `NULL`, generate on-demand (RPC) lalu sertakan di link.

## Laporan: /dashboard/reports/customers

Tambahkan **3 laporan baru** ke `ReportRegistry.ts` di kategori `customers`:

### 1. `customers-reviews-list` — Daftar Review per Pelanggan
Kolom:
| Tanggal Service | Customer | Telepon | Cabang | Layanan | Rating ★ | Kepuasan | Rekomendasi | Channel | Status FU | Catatan |

Sumber: `booking_reviews` JOIN `bookings` (filter periode `submitted_at` atau `created_at`, filter cabang).

### 2. `customers-reviews-kpi` — Ringkasan KPI Review
KPI cards di atas tabel:
- Total Review terkumpul
- Rata-rata Rating (1–5)
- % Puas (`service_quality = 'puas'`)
- % Rekomendasi (`would_recommend = 'ya'`)
- Response Rate = review terisi / booking selesai dlm periode
- Pending Follow-up (booking selesai tanpa review)

Tabel ringkasan harian: tanggal, jumlah review, avg rating, %puas.

### 3. `customers-reviews-channel` — Rekap per Channel & Cabang
Kolom: Channel (`web link` / `WA balas` / `manual admin`) × Cabang dengan jumlah & avg rating.

**Filter** mengikuti pola Reports Hub yang sudah ada (`ReportFilters.tsx`): rentang tanggal + cabang. Tambah filter ekstra di komponen detail bila perlu (rating min, status FU).

**Export Excel & PDF**: otomatis aktif karena REPORTS yang baru memakai `columns` standar — `exportToExcel` dan `exportToPdf` sudah generic.

## Detail Teknis

- File yang diubah:
  - `src/components/admin/ReviewFollowUpPanel.tsx` — template WA baru + ambil token
  - `src/lib/whatsapp.ts` — (jika perlu) helper sisipkan link review
  - `src/components/admin/reports/ReportRegistry.ts` — tambah 3 entri report kategori `customers`
- File baru: tidak ada (semua memanfaatkan struktur Reports Hub & PublicReviewForm yang sudah ada).
- DB: tidak ada migrasi. Kolom `review_submission_token`, `submitted_via`, `service_quality`, `would_recommend`, `rating` sudah tersedia. RLS staff sudah mengizinkan `SELECT` semua review.
- Real-time sinkron: panel sudah memuat ulang via `fetchItems`; opsional tambah subscription `postgres_changes` ke `booking_reviews` agar badge "Sudah dijawab" muncul tanpa refresh manual.

## Yang Tidak Diubah

- Struktur DB & RLS
- Routing publik `/review/:token` (sudah ada)
- Komponen `ManualReviewDialog` (tetap dipakai untuk fallback)
- Reports Hub layout, exporter, dan filter generic

## Hasil Akhir

1. Pelanggan dapat WA berisi link → isi review → masuk DB otomatis.
2. Kalau pelanggan tetap balas chat, admin punya tombol cepat untuk catat manual.
3. Manajer buka `/dashboard/reports/customers`, pilih "Daftar Review per Pelanggan" / "Ringkasan KPI Review" / "Rekap per Channel" → filter periode & cabang → export Excel / PDF.
