## Tahap C — Wave 2 (4 modul)

Migrasi 4 modul dashboard ke standar `FilterBarV2` + quick chips + advanced drawer + active-filter chips + result count, mengikuti pola Wave 1.

### 1. `AuditLogPanel.tsx`
- **Quick chips**: Hari Ini, Minggu Ini, Bulan Ini, 🔴 Severity High, 🟠 Medium, 🟢 Low
- **Advanced drawer**: periode custom, actor (user), action type (multi-select: create/update/delete/login/role_change), target table, severity
- Search universal: actor name/email, action, target id, IP

### 2. `ComplaintsManager.tsx`
- **Quick chips**: ⚡ Perlu Aksi (status `new`), Baru, Ditinjau, Dihubungi, Selesai
- **Advanced drawer**: periode, status (multi), kendaraan brand, ada rekomendasi AI (boolean), guest vs member
- Search universal: keluhan, kendaraan, plat, nama, telepon (sudah ada — pindah ke search FilterBarV2)
- Pertahankan toggle "Perlu Aksi" → konversi jadi quick chip

### 3. `internal/InternalReports.tsx`
- **Quick chips**: 🐛 Bug, 🔧 Revisi, 💡 Masukan, Open, In Progress, ✅ Fixed
- **Advanced drawer**: periode, kategori (multi), status (multi), source (internal/customer/guest), reporter role
- Search universal: judul, deskripsi, reporter name/email/phone (sudah ada — pindah)

### 4. `feedback/FeedbackControlCenter.tsx`
- **Quick chips**: ⚡ Perlu Tindak Lanjut, ⭐ 1–2 (rating rendah), Belum Dibalas, Hari Ini, Minggu Ini
- **Advanced drawer**: periode, rating range, cabang, status follow-up, sumber (public form vs in-app), staff penanggung jawab
- Search universal: nama, isi feedback, booking code

### Pola implementasi (sama untuk 4 modul)
1. Import `FilterBarV2`, `AdvancedFilterSheet`, `useFilterState`, `useFilterPresets`.
2. Inisialisasi `useFilterState("<module-key>")` — `module-key` unik per modul (`audit-log`, `complaints`, `internal-reports`, `feedback-cc`).
3. Ganti UI filter lama → `FilterBarV2` + sheet.
4. Map state lokal lama → state hook (search debounce 300ms, persist localStorage).
5. Active chips: tiap filter aktif tampil sebagai chip removable di Row 2.
6. Footer: `n hasil` + tombol Reset Semua.
7. Preset Simpan/Muat/Hapus aktif lintas device (via `user_filter_presets`).

### Yang TIDAK diubah
- Skema DB / RLS (tidak perlu kolom baru).
- Logika realtime subscription.
- Dialog detail tiap modul.
- Edge function apapun.

### Pengujian
- Tiap modul: search → debounce, quick chip → langsung filter, drawer → multi-select + AND/OR, simpan preset → muat di device lain, reset → bersih, result count akurat.
- Mobile: drawer jadi bottom-sheet, tidak ada horizontal scroll.

Setelah Wave 2 selesai, lanjut **Wave 3** (6 modul sisa: LoyaltyPointsManager, UserVerification, UserRolesManager, FinancialReport, ReportFilters, SlotsManager).
