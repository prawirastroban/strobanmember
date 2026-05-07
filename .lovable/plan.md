## Tambah Laporan Respon Rate Admin di kategori Pelanggan (CRM)

Menambahkan 2 laporan baru di `src/components/admin/reports/ReportRegistry.ts` pada kategori `customers` agar muncul di `/dashboard/reports/customers`. Logika mengikuti pola yang sudah ada di kategori `response` namun difokuskan pada aksi penerimaan booking customer.

### Laporan 1 — `customers-admin-response` "Respon Rate Admin Penerima Booking"
Menampilkan ringkasan per admin yang menangani booking customer (admin cabang & CS pusat).

Kolom:
- Admin (full_name)
- Peran (Admin Cabang / CS Pusat / Admin Pusat)
- Cabang (assigned_branch)
- Total Booking Ditangani (unique booking_id)
- Total Aksi
- Avg Respon (menit) — rata-rata `duration_from_prev_minutes`
- Median (menit)
- Terlama (menit)
- Aksi Terakhir (timestamp aksi terakhir)

Sumber data: `booking_status_logs` (filter rentang & cabang via join `bookings`), join `profiles` + `user_roles` untuk nama & peran. Hanya menghitung transisi yang merupakan respon admin terhadap booking: `pending → waiting_confirmation`, `waiting_confirmation → confirmed`, `confirmed → checked_in`, `checked_in → in_progress`.

KPI strip: Total Admin, Total Booking, Avg Respon Global.

### Laporan 2 — `customers-admin-transition-log` "Log Transisi Booking Customer (Detail)"
Riwayat detail tiap perubahan status booking customer beserta waktu transisinya.

Kolom:
- Waktu (changed_at, datetime)
- Customer (customer_name dari bookings)
- Telepon
- Booking (kode 8 char)
- Cabang
- Admin (full_name)
- Peran
- Transisi (`from_status → to_status`)
- Respon (menit) — `duration_from_prev_minutes`

Sumber: `booking_status_logs` order by `changed_at` desc limit 500, join `bookings` (customer_name, customer_phone, branch), `profiles`, `user_roles`. Filter rentang tanggal & cabang.

### Catatan teknis
- Tidak mengubah skema DB; semua data sudah tersedia di `booking_status_logs`.
- Laporan otomatis muncul di halaman `ReportCategoryPage` untuk kategori `customers` karena di-render dari registry.
- Kompatibel dengan filter periode + cabang yang sudah ada.
- Export Excel/PDF otomatis bekerja karena pakai `ReportTable` standar.

Tidak ada perubahan UI lain — hanya penambahan dua entri di registry.