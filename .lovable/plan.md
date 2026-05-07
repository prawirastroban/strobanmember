
## Tujuan
Saat user memilih **Bank Transfer Manual** atau **QRIS Manual** di `PaymentDialog`, tombol "Lanjutkan" mengarahkan ke halaman instruksi pembayaran yang menampilkan rekening bank / gambar QRIS milik Stroban, lalu user mengunggah bukti transfer. Data rekening & QRIS dikelola admin lewat sub-menu baru di `/dashboard/keuangan/manual-payment` (staff/owner only).

## 1. Database (migration)

**Tabel `manual_payment_accounts`** — daftar rekening bank Stroban
- `id, bank_name (BCA/Mandiri/BRI/...), account_number, account_holder, branch_label?, logo_url?, is_active, sort_order, notes?, created/updated_at`

**Tabel `manual_payment_qris`** — gambar QRIS aktif (biasanya 1 baris aktif)
- `id, label, qris_image_url, merchant_name, is_active, sort_order, created/updated_at`

**Tabel `manual_payment_proofs`** — bukti transfer dari user
- `id, booking_id, payment_id, user_id, method (transfer/qris), bank_account_id?, qris_id?, sender_name, sender_bank?, transfer_amount, transfer_date, proof_url, status (pending/approved/rejected), reviewed_by?, reviewed_at?, reject_reason?, created_at`

**Storage bucket** `payment-proofs` (public read) untuk file bukti transfer + bucket `payment-assets` untuk logo bank & gambar QRIS.

**RLS:**
- `manual_payment_accounts` & `_qris`: SELECT public (hanya `is_active=true` untuk anon/auth user), full CRUD untuk staff/admin.
- `manual_payment_proofs`: user lihat & insert milik sendiri; staff/admin lihat & update semua.
- Storage policies: user boleh upload ke `payment-proofs/{user_id}/...`, staff full access.

**Seed dummy:** 3 rekening (BCA, Mandiri, BRI), 1 QRIS placeholder.

## 2. Halaman User: `/payment/manual/:bookingId`

Route baru di `App.tsx` (protected). Menampilkan:
- Ringkasan: nama service, nominal `formatIDR`, tombol copy nominal.
- Tab "Transfer Bank" / "QRIS" (default sesuai metode dari query `?method=transfer|qris`).
- **Transfer Bank tab**: daftar rekening aktif (logo, bank, no rek dengan tombol copy, atas nama).
- **QRIS tab**: gambar QRIS besar dari `manual_payment_qris` aktif + tombol download.
- Form upload bukti: nama pengirim, bank pengirim (opsional untuk transfer), tanggal transfer, nominal, file (jpg/png/pdf max 5MB) — Zod validated.
- Submit → upload ke storage → insert `manual_payment_proofs` (status pending) → upsert `payments` (method, status pending) → update `bookings.payment_status='awaiting_confirmation'` → toast & redirect ke `/my-booking/:id`.
- Jika sudah ada proof pending: tampilkan status badge + tombol "Upload ulang".

## 3. PaymentDialog perubahan

- Untuk method `transfer` / `qris`: tombol jadi "Lanjutkan" dan `handlePay` melakukan `navigate('/payment/manual/'+bookingId+'?method='+method)` dan close dialog. Tidak insert payment di sini (dipindah ke halaman manual).
- Untuk `pay_at_workshop`: flow tetap (handleManualPay).

## 4. Admin Sub-menu Baru: `/dashboard/keuangan/manual-payment`

Tambah ke `AdminSidebar` di section Keuangan, role gate `requiredRole: "owner"` (staff/admin saja, bukan admin_cabang). Halaman pakai Tabs:

- **Tab "Rekening Bank"**: tabel CRUD `manual_payment_accounts` (bank, no rek, atas nama, status aktif, urutan, logo upload).
- **Tab "QRIS"**: CRUD `manual_payment_qris`, upload gambar, set aktif (toggle).
- **Tab "Bukti Transfer Masuk"**: list `manual_payment_proofs` filter status (pending default). Klik baris → drawer detail (preview bukti, info booking, info pengirim) + tombol **Approve** (set proof approved, payment `paid`, booking `waiting_confirmation`, tulis `payment_logs`/notification ke user) atau **Reject** dengan alasan (set proof rejected + notification user untuk upload ulang).
- Badge angka pending di sidebar (mengikuti pattern existing `counts`).

Route di `Admin.tsx` di-wrap `OwnerOnly` (sesuai pattern existing untuk Financial Report / Branding).

## 5. Pemberitahuan & integrasi

- Insert `notifications` untuk user saat proof diterima/ditolak.
- Insert `activity_logs` saat staff approve/reject.
- Update `PaymentsManager` agar kolom "Bukti" linkable ke proof_url bila method manual.

## 6. Test plan (data dummy + skenario)

Akan dijalankan di akhir via tool insert untuk seed dummy:
- 3 rekening + 1 QRIS aktif.
- Manual: buka booking dummy, test:
  1. Pilih Transfer → halaman tampil rekening → upload bukti JPG → cek status awaiting → admin approve → booking jadi waiting_confirmation, payment paid.
  2. Pilih QRIS → halaman tampil QRIS → upload bukti PDF → admin reject dengan alasan → user dapat notif & bisa upload ulang.
  3. Pilih Bayar Tunai (jika confirmed) → tetap flow lama.
  4. Edge: nominal 0 → tombol disabled; file >5MB → error; tanpa rekening aktif → tampilkan empty state + WA admin.
  5. Cek RLS: user lain tidak bisa lihat proof orang lain; admin_cabang tidak bisa akses sub-menu manual-payment.

## Detail teknis (untuk dev)

```text
src/
  pages/ManualPayment.tsx               (new)
  components/admin/keuangan/
    ManualPaymentManager.tsx            (new — Tabs container)
    BankAccountsTab.tsx
    QrisTab.tsx
    ProofsReviewTab.tsx
supabase/migrations/<ts>_manual_payment.sql
```

Hooks baru: `useManualPaymentAccounts`, `useActiveQris`. Validasi pakai `zod`. Storage upload pakai `supabase.storage.from('payment-proofs').upload(...)` dengan path `${user.id}/${bookingId}/${Date.now()}.${ext}`.

Sidebar entry:
```
{ title: "Pembayaran Manual", url: "/dashboard/keuangan/manual-payment", icon: Banknote, requiredRole: "owner" }
```
