
# Anti-Fraud Flow: Forward-Only Status untuk CS Pusat & Admin Cabang

Mengunci perubahan status agar **CS Pusat (admin)** dan **Admin Cabang (admin_cabang)** tidak bisa memundurkan status booking maupun pembayaran. Hanya **Owner (staff)** yang boleh override dengan alasan tercatat. Kesalahan harus diajukan via **Permintaan Koreksi** ke Owner.

---

## 1. Aturan Forward-Only

### Status Booking (urutan resmi)
```text
pending → waiting_confirmation → confirmed → checked_in → in_progress → completed
                                                                    └→ cancelled (terminal)
```
- Tidak boleh mundur ke index lebih kecil.
- `cancelled` terminal: tidak boleh diubah lagi.
- `completed` terminal: tidak boleh diubah lagi.

### Status Pembayaran (disederhanakan)
```text
belum_lunas (unpaid) → lunas (paid)
```
- Hanya 2 nilai aktif di UI badge: **Belum Lunas** & **Lunas**.
- Nilai legacy (`pending`, `pay_later`, `failed`) tetap di DB tapi di-render sebagai "Belum Lunas".
- Sekali `paid` → terkunci. Tidak ada UI untuk un-pay kecuali role `staff`.

### Yang dikecualikan
- Role **staff (Owner)** bisa override semua kunci, tapi:
  - Wajib isi **alasan** (modal konfirmasi).
  - Otomatis tercatat di `admin_audit_log` (action: `status.override`).

---

## 2. Enforcement di Database (lapis utama)

Trigger `BEFORE UPDATE` di `public.bookings`:

- Cek role pemanggil via `has_role(auth.uid(), 'staff')`.
- Jika **bukan** staff:
  - Tolak jika `NEW.status` lebih awal dari `OLD.status` (berdasarkan ordinal).
  - Tolak jika `OLD.status IN ('completed','cancelled')` dan `NEW.status` berbeda.
  - Tolak jika `OLD.payment_status = 'paid'` dan `NEW.payment_status <> 'paid'`.
- Jika staff: izinkan, tapi log diff ke `admin_audit_log`.

Fungsi helper: `public.booking_status_ordinal(text) → int`.

Trigger juga di `public.payments` untuk field `payment_status` (logika serupa, lock dari `paid`).

---

## 3. Tabel baru: `status_change_requests`

Tempat CS/Admin Cabang mengajukan koreksi mundur.

Kolom utama: `booking_id`, `requested_by`, `target_table` (`bookings`|`payments`), `field`, `from_value`, `to_value`, `reason`, `status` (`pending|approved|rejected`), `reviewed_by`, `reviewed_at`, `review_note`.

RLS:
- Insert: `admin` & `admin_cabang` (cabang-nya saja).
- Select: pengaju + `staff`.
- Update: hanya `staff`.

Trigger approve → eksekusi update via SECURITY DEFINER function `apply_status_change_request(_id)` yang menjalankan update dengan privilege staff, lalu set `status = approved`.

---

## 4. Perubahan UI

### `BookingsManager.tsx` & `MobileBookingRow.tsx`
- Dropdown status booking: opsi yang lebih kecil dari status saat ini di-**disable** dengan tooltip "Forward-only. Ajukan koreksi ke Owner."
- Dropdown payment_status: hanya 2 opsi → **Belum Lunas** / **Lunas**.
  - Jika sudah `paid` & user bukan staff → field jadi badge read-only + tombol "Ajukan Koreksi".
- Badge pembayaran disederhanakan:
  - `paid` → hijau "Lunas"
  - selain itu → kuning/abu "Belum Lunas"

### Komponen baru
- `RequestCorrectionDialog.tsx` — form alasan + submit ke `status_change_requests`.
- `CorrectionRequestsPanel.tsx` — daftar pending untuk Owner di `/dashboard/audit` (atau tab baru "Permintaan Koreksi").
- `StaffOverrideDialog.tsx` — modal konfirmasi alasan saat Owner menurunkan status.

### `EditBookingDialog.tsx`
- Status & payment_status options di-filter sesuai role.
- Staff dapat tombol "Override (perlu alasan)" jika memilih mundur.

---

## 5. Audit & Notifikasi

- Setiap override staff → `admin_audit_log` (action `booking.status.override` / `payment.status.override`) + alasan di `metadata.reason`.
- Setiap pengajuan koreksi → notifikasi ke semua staff via `notifications` table.
- Setiap approve/reject → notifikasi ke pengaju.

---

## 6. Detail Teknis (untuk implementasi)

**Migration baru:**
1. `booking_status_ordinal(text)` function.
2. `enforce_forward_only_booking()` trigger function + trigger di `bookings`.
3. `enforce_forward_only_payment()` trigger function + trigger di `payments`.
4. `status_change_requests` table + RLS + indexes.
5. `apply_status_change_request(_id uuid)` SECURITY DEFINER function.
6. Trigger `notify_correction_request_created` → insert ke `notifications`.

**Frontend touch points:**
- `src/components/admin/BookingsManager.tsx` (dropdown disable + badge)
- `src/components/admin/MobileBookingRow.tsx`
- `src/components/admin/EditBookingDialog.tsx` (filter opsi + override flow)
- `src/components/admin/PaymentsManager.tsx` (badge 2 nilai)
- `src/hooks/useUserRole.ts` (expose `isOwner` = staff)
- baru: `src/components/admin/RequestCorrectionDialog.tsx`
- baru: `src/components/admin/CorrectionRequestsPanel.tsx`
- baru: `src/components/admin/StaffOverrideDialog.tsx`
- route baru: tab "Permintaan Koreksi" di Audit Log page.

**Error handling:**
- Trigger melempar `RAISE EXCEPTION` dengan pesan jelas ("Status tidak boleh mundur. Ajukan koreksi ke Owner.") → ditangkap di UI dan tampilkan toast + auto-buka `RequestCorrectionDialog`.

---

## 7. Yang TIDAK termasuk dalam plan ini
- Metode pembayaran (akan tetap editable seperti sekarang — bisa ditambah di iterasi berikutnya).
- Bukti transfer approval flow (sudah dikunci di `manual_payment_proofs`).
- Migrasi data historis: data lama tetap, kunci hanya berlaku untuk update baru.
