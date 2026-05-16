## Tujuan
Di halaman **Dashboard → Bookings (Transaksi)**, tambahkan dua aksi tambahan yang **hanya muncul untuk user Owner (role DB `staff`)**: **Edit Transaksi** dan **Hapus Transaksi**. Semua aksi dicatat ke **Audit Log**. Selain itu, perluas **FilterBar** agar mudah memfilter berdasarkan pelanggan dan parameter lain yang relevan.

> Catatan istilah: di database, role `staff` = Owner (akses penuh). Role `admin` = CS. Aksi hapus & edit penuh dibatasi hanya untuk Owner. CS / Admin Cabang tetap memakai alur status seperti sekarang.

---

## 1. Aksi tambahan di setiap baris transaksi (Owner only)

**Lokasi**: `BookingsManager.tsx` (desktop table row) & `MobileBookingRow.tsx` (mobile card).

Tampilkan dropdown menu titik-tiga (`MoreVertical`) di ujung baris, **hanya jika `isStaff === true`** (dari `useUserRole`). Isi menu:

- **Edit Transaksi** → buka dialog `EditBookingDialog` (baru).
- **Hapus Transaksi** → buka `AlertDialog` konfirmasi, wajib isi alasan singkat (min 5 karakter).

### 1a. Dialog Edit Transaksi
Field yang dapat diubah Owner:
- Customer: nama, email, telepon
- Kendaraan: tipe mobil, plat nomor
- Layanan: nama layanan (text), harga, durasi (menit)
- Jadwal: tanggal & jam booking, cabang
- Status booking & status pembayaran
- Metode pembayaran
- Catatan internal (customer_notes)

Simpan → `update` ke `bookings` (+ sinkron `payments.payment_method/payment_status` bila berubah) → tulis 1 row ke `admin_audit_log` dengan diff `before` / `after`.

### 1b. Hapus Transaksi
- Hapus row terkait di urutan aman: `manual_payment_proofs` → `payments` → `invoices` → `booking_status_logs` → `booking_reviews` → `bookings`. Lakukan di edge function `admin-delete-booking` (Service Role) supaya RLS tidak menghalangi.
- Wajib alasan; alasan masuk ke `admin_audit_log.metadata.reason`.

---

## 2. Audit logging

Tabel `admin_audit_log` sudah ada. Setiap aksi Owner di halaman ini mencatat:

| Field | Nilai |
|---|---|
| `actor_id` | `auth.uid()` |
| `actor_role` | `'staff'` (Owner) |
| `action` | `booking.edit` / `booking.delete` / `booking.status_change` / `booking.payment_change` |
| `target_type` | `'booking'` |
| `target_id` | `bookings.id` |
| `target_label` | `INV / customer_name / service_name` |
| `before` / `after` | JSON diff field yang berubah |
| `metadata` | `{ reason, branch, ip?, user_agent }` |

Yang dilog: edit, delete, perubahan status manual, perubahan payment_status & payment_method, konfirmasi, approve/reject pembatalan. Helper baru `src/lib/auditLog.ts` → `logAdminAction({...})` agar tidak duplikasi.

---

## 3. FilterBar yang diperluas

Tambahan di FilterBar `BookingsManager`:

**Search** – tambah pencarian by nomor telepon & email customer (selain nama/plat/layanan yang sudah ada).

**Dropdown baru**:
- **Pelanggan** – autocomplete/select daftar customer yang punya booking (dari kolom `customer_name`+`customer_phone`, unik). Untuk Owner & CS bisa pilih semua; Admin Cabang otomatis terbatas cabangnya.
- **Status Pembayaran** – `all / unpaid / pending / paid`.
- **Metode Pembayaran** – `all / cash / transfer / qris` (dari map `payments.payment_method`).
- **Lokasi Servis** – `all / workshop / pickup` (kolom `service_location`).

**Chip tambahan** (toggle cepat):
- **Perlu Konfirmasi Pembatalan** (`cancel_requested = true`).
- **Belum Dibayar** (shortcut payment_status ≠ paid).
- **Ada Pickup** (`pickup_status ≠ idle`).

**Range filter**:
- **Nominal** (Rp) – min/max untuk `service_price`.

Timeline preset (hari ini, minggu ini, dll.) yang sudah ada tetap dipertahankan.

**Owner-only chip**: **🛡 Mode Owner** – menampilkan kolom "Dibuat oleh" + tombol aksi tambahan di tabel desktop.

---

## 4. Perubahan database (1 migration)

```text
- ALTER POLICY: tambah policy DELETE pada public.bookings hanya untuk has_role(uid,'staff')
- (opsional) index: CREATE INDEX bookings_customer_phone_idx ON bookings (customer_phone)
- Tidak ada perubahan struktur tabel.
```

Edge function baru: `supabase/functions/admin-delete-booking/index.ts` (Service Role, validasi pemanggil = role `staff`, hapus dependensi lalu booking, insert ke `admin_audit_log`).

---

## 5. File yang dibuat / diubah

**Baru**
- `src/components/admin/EditBookingDialog.tsx`
- `src/components/admin/DeleteBookingDialog.tsx`
- `src/lib/auditLog.ts`
- `supabase/functions/admin-delete-booking/index.ts`
- 1 migration SQL (policy delete + index)

**Diubah**
- `src/components/admin/BookingsManager.tsx` – integrasi menu Owner, FilterBar baru, pemanggilan `logAdminAction`.
- `src/components/admin/MobileBookingRow.tsx` – tombol menu Owner (Edit/Hapus) di footer kartu.
- `src/hooks/useUserRole.ts` – sudah cukup (`isStaff`), tidak diubah.

---

## 6. Catatan keamanan
- Tombol disembunyikan di UI **dan** divalidasi ulang di server (RLS DELETE policy + edge function memeriksa role) supaya tidak bisa di-bypass dari devtools.
- Alasan hapus wajib agar audit trail bermakna.
- Tidak menyentuh schema `auth/storage/realtime`.

Setelah disetujui, saya akan jalankan migration dulu, lalu implementasi UI + edge function.