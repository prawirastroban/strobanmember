# Audit & Standarisasi Filter Dashboard

Tahap 1 = **laporan audit** (tidak ada perubahan kode). Tahap 2 = implementasi bertahap setelah audit disetujui.

---

## 1. Laporan Audit per Halaman

Status: ✅ Sesuai standar saat ini · ⚠️ Sebagian (perlu refactor) · ❌ Belum ada filter

| Modul | Halaman / Komponen | Status | Catatan |
|---|---|---|---|
| Booking | `BookingsManager.tsx` | ⚠️ | Sudah pakai `FilterBar` (search, timeline, chips status, dropdown cabang/metode bayar). Belum: drawer "Semua Filter", chip filter aktif, mode AND/OR, preset, "Perlu Aksi/Pickup Aktif" sebagai quick chip. Search belum debounce 300ms (saat ini 350ms—OK, namun belum konsisten antar halaman). |
| Booking | `SlotsManager.tsx` | ⚠️ | Filter cabang/tanggal manual, tidak pakai `FilterBar`. |
| Customer | `CustomerList.tsx` | ⚠️ | Sudah `FilterBar` (search, timeline). Belum: chip "Belum Verifikasi / VIP / Aktif 30 hari", dropdown cabang assign, drawer advanced, preset. |
| Customer | `CustomerDetail.tsx` | – | Detail view, tidak perlu filter list. |
| Kendaraan | (tidak ada list admin khusus; data muncul di `CustomerDetail`) | ❌ | Belum ada halaman admin "Daftar Kendaraan" dengan filter (merek, tahun, terakhir servis). Opsional tambah jika dibutuhkan. |
| CRM | `CRMDashboard.tsx` | ⚠️ | Punya search + range. Belum standar `FilterBar`, tanpa timeline preset, tanpa chip filter aktif. |
| CRM | `CRMAnalytics.tsx` | ❌ | Hanya periode hard-coded. Tidak ada filter cabang/segment. |
| CRM | `CustomerActivitySummary.tsx` | ⚠️ | Search saja, tanpa timeline. |
| Marketing | `MarketingOverview.tsx` | ❌ | Tidak ada filter periode/cabang. |
| Marketing | `PromosManager.tsx` | ❌ | Tidak ada filter status (aktif/expired/draft) atau search. |
| Marketing | `RewardsManager.tsx` | ❌ | Tidak ada filter status/kategori. |
| Marketing | `LoyaltyPointsManager.tsx` | ⚠️ | Search ada, tanpa filter periode/transaksi type/cabang. |
| Marketing | `LoyaltyAnalytics.tsx` | ❌ | Periode hard-coded. |
| Marketing | `ReviewFollowUpPanel.tsx` | ❌ | Tidak ada filter rating/status. |
| Laporan | `reports/ReportFilters.tsx` | ⚠️ | Sudah timeline + cabang, tidak pakai komponen `FilterBar` umum—format berbeda dari modul lain. |
| Laporan | `FinancialReport.tsx` | ⚠️ | Hanya dropdown 7/14/30 hari. Tidak pakai timeline preset standar. |
| Keuangan | `FinanceDashboard.tsx` | ❌ | Tidak ada filter. |
| Keuangan | `PaymentsManager.tsx` | ✅/⚠️ | Sudah `FilterBar` (search, timeline, chips status, dropdown metode, range nominal). Belum: chip aktif, drawer advanced, preset. |
| Keuangan | `keuangan/ManualPaymentManager.tsx` | ❌ | Tidak ada filter status (pending/approved/rejected), cabang, periode. |
| Keuangan | `keuangan/ReferralManager.tsx` | ❌ | Tidak ada filter periode/status withdrawal. |
| Keuangan | `keuangan/AntiFraudPanel.tsx` | ❌ | Tidak ada filter periode/severity. |
| Transaksi | `TransactionHistory.tsx` | ✅/⚠️ | Pakai `FilterBar` lengkap. Belum: drawer advanced, chip aktif, preset, AND/OR. |
| Transaksi | `TestTransactions.tsx` | – | Tool dev, tidak perlu. |
| Audit Log | `AuditLogPanel.tsx` | ⚠️ | Search ada, belum timeline preset, belum filter actor/action type/table. |
| Audit Log | `CorrectionRequestsPanel.tsx` | ❌ | Tidak ada filter status/periode. |
| Komplain | `ComplaintsManager.tsx` | ⚠️ | Search ada, belum timeline standar/chip status/priority. |
| Komplain | `ComplaintInbox.tsx` | ❌ | Tidak ada filter. |
| Internal | `internal/InternalReports.tsx` | ⚠️ | Punya search + 3 dropdown manual. Belum pakai `FilterBar`, belum timeline, belum chip aktif. |
| Feedback | `feedback/FeedbackControlCenter.tsx` | ⚠️ | Search + tabs. Belum timeline/cabang/rating. |
| Verifikasi | `UserVerification.tsx` | ⚠️ | Search saja, belum filter status. |
| Roles | `UserRolesManager.tsx` | ⚠️ | Search saja, belum filter role. |
| Service Mgmt | `ServiceManager.tsx`, `TireManager.tsx`, `BranchManager.tsx`, `LegalDocumentsManager.tsx`, `BrandingManager.tsx` | – | Master data konfigurasi, filter ringan (cukup search) sudah/diabaikan. |

**Ringkasan**
- ✅ Mendekati standar: 3 modul (Bookings, Payments, TransactionHistory) — semua via `FilterBar` tapi belum punya drawer/chip-aktif/preset.
- ⚠️ Perlu refactor: 13 modul.
- ❌ Belum ada filter / hard-coded: 12 modul.

---

## 2. Standar Baru (final)

**Komponen tunggal**: `src/components/admin/filters/FilterBarV2.tsx` (komponen baru, `FilterBar.tsx` lama tetap untuk backward compatibility lalu dimigrasi).

Struktur visual (maks 2 baris permanen):
```
Row 1: [🔍 Search universal] [Quick chips ▸ horizontal scroll] [Semua Filter ⇲] [Reset]
Row 2: [Chip filter aktif: Cabang Bandung ×] [Belum Bayar ×] [Bulan Ini ×] · "128 hasil"
```

Advanced filter (drawer di desktop / bottom-sheet di mobile via `Sheet` shadcn) berisi:
- Periode (timeline preset + custom)
- Status (multi-select)
- Cabang
- Customer (autocomplete)
- Metode pembayaran
- Nominal (range)
- Lokasi pickup
- Staff
- Custom field per modul (slot via props)
- Mode logika: ( ) Semua kondisi (AND)  ( ) Salah satu (OR)
- Section Preset: Simpan / Muat / Hapus

**Search universal** menerima kata kunci yang dipetakan ke field per modul (nama, no HP, plat, kode booking, no invoice, dll). Debounce 300ms (standar baru, konsisten semua modul).

**Persistence**: state filter terakhir disimpan per modul di `localStorage` key `filters:<module>` + preset user disimpan di tabel `user_filter_presets` (Supabase) supaya bisa lintas device.

**Performance**: bila estimasi data >100 record, fetch server-side via `.eq/.gte/.lte/.or`; kurang dari itu, filter client-side cukup.

**Mobile/Desktop**:
- Mobile (<768px): chips horizontal-scroll, dropdown jadi bottom-sheet, drawer = bottom-sheet `Sheet side="bottom"`.
- Desktop: drawer = side panel `Sheet side="right"` lebar 420px.
- Tidak ada horizontal page scroll: semua container `min-w-0 overflow-hidden`, chip area `overflow-x-auto`.

---

## 3. Rencana Implementasi (bertahap, butuh persetujuan ulang sebelum tahap 2 dieksekusi)

**Tahap A — Fondasi (1x PR)**
1. Buat `FilterBarV2.tsx` dengan: search debounce, quick chips, active-filter chips, tombol "Semua Filter" yang membuka `Sheet`, footer hasil + reset.
2. Buat `AdvancedFilterSheet.tsx` (drawer/bottom-sheet) berisi section reusable (Periode, Status, Cabang, Metode, Nominal, Staff, Lokasi, Custom slot, AND/OR, Preset).
3. Tambah hook `useFilterState(moduleKey)` — handle persist localStorage + debounce search + helper `toggleChip`, `setLogic`, `applyPreset`.
4. Tabel `user_filter_presets` (id, user_id, module, name, payload jsonb, created_at) + RLS owner-only + grants.
5. Tidak mengubah halaman apa pun di tahap ini — komponen dipakai mulai tahap B.

**Tahap B — Migrasi modul prioritas tinggi** (3 modul tersering dipakai)
- `BookingsManager`, `TransactionHistory`, `PaymentsManager` → ganti `FilterBar` → `FilterBarV2`, definisikan quick-chips & advanced fields modul masing-masing, server-side filter dipertahankan.

**Tahap C — Modul perlu refactor**
- CustomerList, CRMDashboard, AuditLogPanel, ComplaintsManager, InternalReports, LoyaltyPointsManager, UserVerification, UserRolesManager, FinancialReport, ReportFilters, FeedbackControlCenter, CustomerActivitySummary, SlotsManager.

**Tahap D — Modul tanpa filter** (tambah filter standar minimal: search + timeline + status chips)
- PromosManager, RewardsManager, ManualPaymentManager, ReferralManager, AntiFraudPanel, MarketingOverview, CRMAnalytics, LoyaltyAnalytics, ComplaintInbox, CorrectionRequestsPanel, ReviewFollowUpPanel, FinanceDashboard.

**Tahap E — Cleanup**
- Hapus `FilterBar.tsx` lama setelah seluruh modul migrasi.
- Tambah indikator `n hasil` konsisten dan persist state per user.

---

## 4. Dampak UX (estimasi)

| Aspek | Sebelum | Sesudah |
|---|---|---|
| Waktu pencarian data spesifik | 8–20 dtk (scroll/multi klik) | 2–4 dtk (search universal + chip aktif) |
| Konsistensi antar modul | rendah (3 pola berbeda) | tinggi (1 komponen) |
| Mobile usability | sering overflow horizontal, dropdown menumpuk | bottom-sheet rapi, 2 baris maks |
| Repeat search (preset) | tidak ada | 1 klik via preset tersimpan |
| Beban load awal pada tabel besar | full fetch | server-side filter — lebih ringan |
| Risiko regresi | – | sedang: setiap modul perlu QA setelah migrasi (mitigasi: migrasi bertahap, modul tinggi prioritas dulu) |

---

## 5. Catatan Teknis

- Tidak ada fitur lama yang dihapus pada tahap audit ini.
- `FilterBar.tsx` lama dipertahankan hingga semua modul migrasi.
- Tambah satu tabel baru `user_filter_presets` (perlu migration + RLS + grants) saat tahap A dijalankan.
- Komponen baru memakai `Sheet`, `Input`, `Select`, `Badge` dari shadcn yang sudah ada — tidak perlu dependency baru.
- i18n: label baru ditambahkan ke `src/i18n/id.ts` dan `en.ts`.

---

**Aksi berikutnya yang saya butuhkan dari Anda:**
1. Setujui laporan audit ini (atau koreksi modul yang dilewati).
2. Konfirmasi prioritas tahap B (3 modul) atau ingin urutan berbeda.
3. Setujui pembuatan tabel `user_filter_presets` untuk preset lintas device (jika tidak, preset disimpan hanya di localStorage).
