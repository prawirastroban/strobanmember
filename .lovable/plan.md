## Tujuan
Menggabungkan dua section terpisah — "Ringkasan" (Smart Alerts) dan "Perlu Perhatian" (NeedAttention) — menjadi satu kategori "Perlu Perhatian" di Admin Dashboard, sehingga semua item yang butuh aksi (Manage Promo, Verifikasi User, Pending Booking, Booking terlambat, Keluhan, Permintaan koreksi, Bug) tampil dalam satu tempat dengan styling konsisten.

## Perubahan yang Dilakukan

### 1. Hapus judul "Ringkasan" terpisah
- Hapus `<h2>Ringkasan</h2>` dan wrapper `<div className="space-y-2">` untuk Smart Alerts di `AdminDashboard.tsx`.

### 2. Integrasikan Smart Alerts ke dalam `NeedAttention`
- Ubah komponen `NeedAttention` di `DashboardHomeBlocks.tsx` agar menerima props: `pendingAll`, `inactivePromos`, `unverifiedCount`, dan `isStaff`.
- Tambahkan 3 item baru ke dalam array `allRows`:
  - "Pending booking menunggu konfirmasi" (count: `pendingAll`, tone: amber, url: /dashboard/bookings)
  - "Promo tidak aktif / expired" (count: `inactivePromos`, tone: orange, url: /dashboard/rewards, hanya jika `isStaff`)
  - "User baru menunggu verifikasi" (count: `unverifiedCount`, tone: blue, url: /dashboard/user-verification)

### 3. Styling konsisten
- Semua item ditampilkan dalam grid 2-kolom (responsive) dengan glass-card styling yang sama seperti `NeedAttention` saat ini.
- Setiap item memiliki: ikon, label, count, dan tombol "Lihat" →, dengan warna tone sesuai tingkat urgensi.
- Jika tidak ada item sama sekali, tetap tampilkan pesan "Semua aman — tidak ada antrian aksi saat ini."

### 4. Update `AdminDashboard.tsx`
- Pindahkan logika Smart Alerts (pendingAll, inactivePromos, unverifiedCount) yang saat ini di-render langsung, menjadi props yang diteruskan ke `NeedAttention`.
- Urutan section di dashboard tetap: `NeedAttention` (gabungan) → `QuickAccessGrid` → `Quick Actions` → `KPI Cards` → dst.

## Files yang Diubah
- `src/components/admin/AdminDashboard.tsx` — hapus Ringkasan section, pass props ke NeedAttention
- `src/components/admin/DashboardHomeBlocks.tsx` — expand NeedAttention dengan 3 item baru

## Tidak Ada Perubahan Backend
- Tidak ada query database baru, tabel baru, atau edge function. Semua data sudah tersedia dari state yang ada di `AdminDashboard`.