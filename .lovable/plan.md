## Tujuan
Di halaman `/dashboard/audit-log`, untuk setiap baris audit `booking.delete`, tampilkan tombol **"Pulihkan Transaksi"** yang hanya bisa diakses role **staff (Owner)**. Tombol akan mengembalikan booking yang dihapus berdasarkan snapshot `before` yang tersimpan di `admin_audit_log`.

## Cara Kerja
Saat booking dihapus via `admin-delete-booking`, snapshot lengkap baris `bookings` sudah disimpan di kolom `before` audit log. Snapshot ini cukup untuk merekonstruksi booking. Catatan: pembayaran, invoice, dan status log anak ikut terhapus permanen — restorasi hanya memulihkan **booking utama** (status di-set `cancelled` + payment_status `unpaid` agar Owner bisa atur ulang).

## Yang Akan Dibuat / Diubah

### 1. Edge Function baru: `supabase/functions/admin-restore-booking/index.ts`
- Verify JWT → cek role harus `staff` (Owner). Jika bukan → 403.
- Input: `{ audit_log_id: string }`.
- Ambil baris `admin_audit_log` dengan `action = 'booking.delete'` dan ambil `before` (snapshot booking).
- Cek apakah booking dengan id snapshot sudah ada di tabel `bookings`. Jika ada → 409 "Sudah dipulihkan".
- Insert ulang booking via service role dari snapshot, override:
  - `status = 'cancelled'`
  - `payment_status = 'unpaid'`
  - `updated_at = now()`
- Tulis audit baru dengan `action = 'booking.restore'`, `target_id = bookingId`, `metadata: { restored_from_audit_id }`.
- Return `{ success: true, booking_id }`.

### 2. Daftarkan label aksi baru di `src/components/admin/AuditLogPanel.tsx`
- Tambah `"booking.delete"` dan `"booking.restore"` ke `ACTION_LABELS`.
- Pakai hook `useUserRole()` → `isStaff` saja yang boleh lihat tombol.
- Tombol **"Pulihkan"** muncul pada baris `r.action === "booking.delete"` & `isStaff === true` & `r.before?.id` ada.
- Klik → confirm dialog (AlertDialog) → panggil `supabase.functions.invoke('admin-restore-booking', { body: { audit_log_id: r.id } })`.
- Toast sukses / error, lalu `load()` ulang daftar.

### 3. (Opsional kecil) Tambah label di `src/lib/auditLog.ts`
- Extend `AuditAction` union dengan `"booking.restore"` agar typesafe jika dipakai dari client lain.

## Catatan Teknis
- Tidak ada perubahan skema DB / RLS — Edge Function pakai service role, otorisasi role di-cek server-side.
- Children (payments/invoices/status logs) **tidak** dipulihkan otomatis karena tidak disnapshot. Pesan dialog konfirmasi akan menjelaskan hal ini.
- Idempotent: cek duplikat sebelum insert agar tombol bisa diklik ulang tanpa korup.

## Verifikasi
1. Hapus 1 booking test → cek baris muncul di Audit Log.
2. Sebagai Owner, klik **Pulihkan** → cek booking kembali ada di `/dashboard/bookings` dengan status `cancelled`.
3. Login sebagai role `admin` (CS) → tombol Pulihkan tidak tampil, dan panggilan langsung ke edge function ditolak 403.
