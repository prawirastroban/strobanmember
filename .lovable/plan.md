## Wave 3 — Tahap D (Final)

Migrasi modul list-view yang tersisa ke `FilterBarV2`, tanpa memaksakan pola yang tidak cocok.

### Scope migrasi penuh ke FilterBarV2 (3 modul)

**1. `LoyaltyPointsManager.tsx`**
- Quick chips:
  - ⭐ Member Aktif (total_points > 0)
  - 🆕 Belum Ada Poin (total_points = 0)
  - 🏆 Top Member (total_points >= 1000)
- Universal search: nama, telepon, Customer ID (CUST-XXXXXX)
- Footer: `n hasil` + Reset
- Preset key: `loyalty-members`

**2. `UserVerification.tsx`**
- Quick chips:
  - ⚡ Perlu Aksi (unverified, default ON jika ada unverified)
  - ✅ Verified
  - ⏳ Unverified
  - 🆕 Pendaftar Baru (created_at < 24 jam)
- Universal search: nama, email, telepon
- Footer: `n hasil` + Reset
- Preset key: `user-verification`
- Ganti tombol "⚡ Perlu Aksi" manual yang sudah ada dengan chip standar

**3. `UserRolesManager.tsx`**
- Quick chips per role:
  - 👤 Customer
  - 🛠 Staff
  - 🏢 Admin Cabang
  - 🛡 Admin
- Universal search: nama, Customer ID, telepon
- Footer: `n hasil` + Reset
- Preset key: `user-roles`

### Penyelarasan ringan (1 modul)

**4. `FinancialReport.tsx`**
- Ganti dropdown "Last 7/14/30 days" → `TimelineValue` + `TIMELINE_PRESETS` (Hari Ini/Minggu Ini/Bulan Ini/Custom)
- Adopsi `getDateRange()` agar konsisten dengan modul lain
- **Tidak** pakai FilterBarV2 (chart, bukan list filterable)
- Sub-komponen `ReportFilters.tsx` tetap digunakan apa adanya — sudah konsisten

### Skip (alasan)

**5. `reports/ReportFilters.tsx`** — sudah pakai `TIMELINE_PRESETS` + branch scoping; tidak diubah.

**6. `SlotsManager.tsx`** — bukan list filterable; ini operational config (branch + tanggal untuk edit kapasitas slot). Memaksakan FilterBarV2 akan merusak UX. **Tidak diubah.**

### Pola implementasi (sama dengan Wave 1 & 2)

```tsx
import { FilterBarV2 } from "@/components/admin/filters/FilterBarV2";
import { AdvancedFilterSheet } from "@/components/admin/filters/AdvancedFilterSheet";
import { useFilterState } from "@/components/admin/filters/useFilterState";
import { useFilterPresets } from "@/components/admin/filters/useFilterPresets";

const { state, set, reset } = useFilterState("<module-key>", initial);
// 300ms debounce search, localStorage persist, active chips row 2
```

### Yang tidak diubah
- Skema DB / RLS / triggers
- Realtime subscriptions
- Edge functions (`admin-user-ops`)
- Dialog detail (adjust points, reset password, verify, dll.)
- Logika `adjust_loyalty_points` RPC

### Output akhir Wave 1+2+3
Total 14 modul dashboard akan konsisten dengan `FilterBarV2` system, dan 2 modul (Reports/Slots) tetap dengan filter spesialisnya. Setelah Wave 3 selesai, seluruh standardisasi filter dashboard selesai.

### Setelah approval
Saya akan implementasi 4 file di atas dalam satu pass paralel.
