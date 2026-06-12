## Booking Source & Platform Adoption Analytics

Goal: ukur efektivitas platform self-booking vs booking manual, tanpa merusak laporan / endpoint yang sudah berjalan.

---

### 1. Skema database (migration baru, non-destructive)

Tambahkan kolom di `public.bookings`:

- `booking_source TEXT` — enum-string: `self_booking | branch_staff | booking_manager | marketing | call_center | referral | promo | api | import | lainnya`. Default `self_booking`.
- `created_by_role TEXT` — snapshot role saat insert (`user | staff | admin | owner | system`).
- `created_branch TEXT` — snapshot cabang admin/staff yang membuat booking (nullable; untuk self-booking = NULL).
- `acquisition_source TEXT` (di `profiles`) — sumber pertama customer masuk: `self_booking | referral | promo | marketing | call_center | branch | google_search | social_media | direct_visit | lainnya`.
- `first_booking_source TEXT` (di `profiles`) — diisi 1x oleh trigger saat booking pertama dibuat.

Index ringan untuk laporan: `bookings(booking_source, booking_date)`, `bookings(created_by, booking_date)`.

Backfill aman untuk data lama:
- `booking_source = 'self_booking'` jika `created_by = user_id` atau `created_by IS NULL`
- `booking_source = 'branch_staff'` jika `created_by` punya role staff
- `booking_source = 'booking_manager'` / `admin` jika role admin/owner
- `profiles.first_booking_source` diisi dari booking paling awal per user.

Trigger `set_booking_source_defaults()` (BEFORE INSERT): jika `booking_source` NULL → tentukan otomatis dari `created_by` vs `user_id` + role; isi `created_by_role` & `created_branch` dari `user_roles` + `profiles.branch_assignment`.

Trigger `set_first_booking_source()` (AFTER INSERT): isi `profiles.first_booking_source` & `acquisition_source` (jika kosong) dari booking pertama user.

### 2. Call-site update (eksplisit > trigger)

Set `booking_source` saat insert agar jelas & auditable:

- `src/pages/Booking.tsx` (line ~389) → `booking_source: 'self_booking'`
- `src/components/booking/MobileBookingWizard.tsx` (line 332, 1104) → `'self_booking'`
- `src/components/admin/QuickBookingDialog.tsx` (line 138) → `'booking_manager'` (admin/owner) atau `'branch_staff'` (staff cabang) berdasar role aktif
- `src/components/admin/StaffQuickBookingDialog.tsx` (line 360) → sama, berbasis role
- Edge function `midtrans-create-cart-checkout` & `midtrans-test-transaction` → tetap `'self_booking'`

Tidak ada endpoint existing yang diubah signature-nya, hanya tambahan field.

### 3. Report Builder — tambah field whitelist

File: `src/components/admin/reports/builder/dataSources.ts`

Pada source `bookings` tambahkan field selectable (dimension + filter + group):
- `booking_source`, `created_by`, `created_by_role`, `created_branch`

Pada source `profiles` tambahkan:
- `acquisition_source`, `first_booking_source`

Group/filter/agregasi otomatis bekerja (builder sudah generik).

### 4. Laporan standar baru (file: `extraReports.ts`)

Tambah kategori `adoption` ("Adopsi Platform") + report definitions berikut (semua mengikuti pola `ReportDefinition` existing, tanpa menyentuh report lama):

a. **booking-source-performance** (kategori `adoption`)
   Kolom: Source, Total Booking, Revenue (completed), Total Customer (distinct phone), Avg Transaction, Conversion Rate (`completed/total`).
   Group by `booking_source`. Filter periode + cabang.

b. **self-booking-rate** (`adoption`)
   KPI strip: Total Booking, Self Booking, Manual Booking, Self Booking Rate (%).
   Tabel harian: Tanggal, Total, Self, Manual, Rate %.

c. **booking-manager-performance** (`adoption`)
   Join `bookings.created_by` → `profiles.full_name` (client-side map). Kolom: Nama, Total, Revenue, Customer Unik, Selesai, Batal, Conversion Rate.
   Hanya rows dengan `booking_source IN ('booking_manager','branch_staff','call_center','marketing')`.
   Filter: cabang, periode, status.

d. **customer-acquisition-source** (`customers`)
   Kolom: Source, Jumlah Customer, Customer Aktif (≥1 booking selesai), Revenue Lifetime.
   Group by `profiles.acquisition_source`.

Semua memakai exporter Excel/PDF yang sudah ada (otomatis dari kolom format).

### 5. Owner Dashboard KPI widget

File baru: `src/components/admin/PlatformAdoptionKPI.tsx`.
Dipasang di `src/components/admin/OwnerOverview.tsx` (atau panel owner yang sesuai) — read-only, role-gated `owner`.

KPI cards:
- Total Booking, Self Booking, Manual Booking, Self Booking Rate
- Customer Baru, Customer Repeat
- Referral Conversion (`referral_commissions.status='paid' / referral_signups_meta`)
- Promo Conversion (`promo_claims used / total bookings`)

Range: periode aktif dari `useDashFilters` (sudah ada). Tidak menggantikan KPI existing — ditambahkan sebagai section baru "Adopsi Platform".

### 6. Constraint perilaku

- Tidak menghapus / merename report existing.
- Tidak mengubah endpoint edge function existing (hanya menambah field di payload insert).
- RLS bookings tidak diubah (kolom baru ikut policy existing).
- Migration include GRANT/policy update hanya jika kolom baru perlu — kolom di tabel existing tidak butuh GRANT tambahan.

### File yang akan dibuat / disentuh

Baru:
- `supabase/migrations/<ts>_booking_source_tracking.sql`
- `src/components/admin/PlatformAdoptionKPI.tsx`

Diedit:
- `src/components/admin/reports/builder/dataSources.ts`
- `src/components/admin/reports/extraReports.ts` (tambah kategori + 4 report)
- `src/pages/Booking.tsx`
- `src/components/booking/MobileBookingWizard.tsx`
- `src/components/admin/QuickBookingDialog.tsx`
- `src/components/admin/StaffQuickBookingDialog.tsx`
- `supabase/functions/midtrans-create-cart-checkout/index.ts`
- `supabase/functions/midtrans-test-transaction/index.ts`
- `src/components/admin/OwnerOverview.tsx` (mount widget)

### Catatan teknis

- Snapshot role di `created_by_role` agar laporan historis tetap akurat kalau role user berubah.
- `booking_source = 'self_booking'` ditentukan dengan rule: `created_by IS NULL OR created_by = user_id` saat trigger fallback. Penentuan eksplisit di call-site memenangkan trigger.
- Distinct customer dihitung dari `customer_phone` (lebih stabil daripada `user_id` untuk walk-in tanpa akun).
