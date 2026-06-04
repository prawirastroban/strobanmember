## Tambah Estimasi Antrian untuk Booking Check-In

Saat status booking = `checked_in` tapi belum dikerjakan (menunggu antrian), admin/staff bisa mencatat **estimasi jam mulai dikerjakan** + **catatan antrian**. Info ini:
- Tampil di Rincian Booking (admin & customer).
- Otomatis terkirim sebagai notifikasi ke pelanggan.
- Tercatat di CRM via `activity_logs` dan `booking_status_logs`.

### 1. Migrasi DB (`bookings`)
Tambah 3 kolom nullable:
- `queue_estimated_start` (timestamptz) — estimasi jam mulai dikerjakan.
- `queue_note` (text) — catatan antrian (mis. "antrian 2 mobil di depan").
- `queue_set_at` (timestamptz) + `queue_set_by` (uuid) — audit ringan.

Tidak ada perubahan RLS (sudah ter-cover policy update admin/staff/admin_cabang).

### 2. Komponen baru: `QueueEstimateDialog.tsx` (admin)
Dialog kecil dengan:
- Input **time** (HH:mm, default = sekarang + 30 menit, dibatasi hari yang sama dgn `booking_date`).
- Textarea **Catatan Antrian** (opsional, max 280 char).
- Tombol **Simpan** → update `bookings` (3 kolom di atas) + insert ke `notifications` ke `user_id` pelanggan (judul: "Estimasi Pengerjaan Diperbarui", body: jam + catatan) + insert `activity_logs` type `booking` ("Queue estimate set: HH:mm — <note>").
- Tombol **Hapus Estimasi** (jika sudah ada) → null-kan 3 kolom + log.

### 3. Integrasi `BookingsManager.tsx`
- Field tambahan di interface `Booking`: `queue_estimated_start`, `queue_note`, `queue_set_at`.
- Saat `booking.status === "checked_in"`:
  - Di card list: tampilkan badge kecil "Antri • mulai HH:mm" jika `queue_estimated_start` terisi.
  - Tombol primary CTA tetap **"Mulai Dikerjakan"**, tapi ditambah tombol sekunder kecil **"Atur Estimasi Antrian"** (icon `Clock`) yang membuka `QueueEstimateDialog`.
- Di dialog Rincian Booking → section baru **"Antrian"** (hanya jika `status === checked_in` atau ada data antrian):
  - Row "Estimasi Mulai" → `HH:mm` formatted, fallback "—".
  - Row "Catatan Antrian" → full-width seperti catatan pelanggan.
  - Row "Diatur" → `queue_set_at` + nama staff (resolve dari `profiles` via existing helper jika ada, fallback timestamp saja).
  - Tombol **Atur / Ubah Estimasi**.

### 4. Tampilan untuk Customer
- `src/pages/BookingStatus.tsx` & `src/pages/ServiceProgress.tsx` (atau `LiveProgressTracker`): jika `status === checked_in` dan `queue_estimated_start` ada, tampilkan banner kecil:
  > "Kendaraan Anda dalam antrian. Estimasi mulai dikerjakan pukul **HH:mm**. — <queue_note>"
- Realtime tetap jalan via subscription `bookings` yang sudah ada.

### 5. CRM
- `activity_logs` baris baru type `booking`, description `Queue estimate set/cleared`, metadata `{booking_id, estimated_start, note}`. Otomatis muncul di panel CRM/Activity (sudah ada feed `activity_logs`).
- Auto-reset 3 kolom queue saat status berpindah ke `in_progress`/`completed`/`cancelled` (trigger ringan di migrasi).

### Yang TIDAK diubah
- Skema `payments`, `invoices`, `notifications` (selain insert standar).
- Edge function (semua via PostgREST + trigger).
- Status flow forward-only — tidak ada status baru, hanya metadata tambahan.
