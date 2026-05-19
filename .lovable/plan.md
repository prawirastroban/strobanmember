## Tujuan

Tiga perbaikan terkait alur booking → pembayaran:

1. Ganti dual button "Bayar di Tempat / Bayar Sekarang" di akhir wizard booking menjadi **single CTA "Konfirmasi Pesanan Booking"** (pilih metode bayar dipindah ke setelah admin konfirmasi).
2. Sembunyikan tombol "Upload Bukti Transfer / QRIS" sampai booking benar-benar `confirmed` & metode bayar = transfer/QRIS.
3. Perbaiki layout mobile `StaffQuickBookingDialog` step 4 (Service & Schedule) — Date/Time picker bertabrakan dengan tombol Back/Next.

---

## 1. Single CTA "Konfirmasi Pesanan Booking"

### Flow baru (disepakati: Opsi A)

```text
Wizard 4 step (Layanan → Kendaraan → Jadwal → Konfirmasi)
   ↓ klik [Konfirmasi Pesanan Booking]
Booking dibuat: status=waiting_confirmation, payment_status=unpaid, payment_method=null
   ↓ admin verifikasi di dashboard
status=confirmed
   ↓ di /my-booking/:id muncul "Pilih Metode Pembayaran"
   [ Bayar di Tempat ] [ Transfer / QRIS ] [ Bayar Online (Midtrans) ]
   ↓ pilih → simpan payment_method, lalu:
     - tempat   → status pembayaran "Bayar di Kasir" (tetap unpaid sampai check-in)
     - transfer → muncul tombol Upload Bukti
     - online   → buka Midtrans dialog
```

### Perubahan file

**`src/pages/Booking.tsx`** (desktop wizard)
- Hapus dua tombol di sticky-bar (line 974-990). Ganti satu tombol full-width: `Konfirmasi Pesanan Booking` (icon: CheckCircle2).
- `submitBooking()` jadi tanpa argumen. Set `status: "waiting_confirmation"`, `payment_status: "unpaid"`, `payment_method: null`.
- Navigate ke `/my-booking/:id` (tanpa `?pay=1`).
- Toast: "Pesanan terkirim — menunggu konfirmasi admin".

**`src/components/booking/MobileBookingWizard.tsx`** (mobile wizard, line 805-822)
- Sama: ganti `grid-cols-2` jadi satu tombol full-width "Konfirmasi Pesanan Booking".
- `submitBooking()` mirror perubahan di Booking.tsx.

**`src/pages/MyBooking.tsx`** (pasca-konfirmasi)
- Tambah komponen baru `PaymentMethodPicker` (3 kartu pilih metode) yang **hanya muncul ketika** `booking.status === "confirmed" && !booking.payment_method && unpaid && isOwner`.
- Setelah customer pilih metode, update kolom `bookings.payment_method` (`onsite` / `transfer` / `online`) lalu render section eksisting sesuai metode.
- Tombol "Bayar Sekarang" (Midtrans) saat ini gated `payAllowed` — tetap, tapi sekarang hanya muncul jika `payment_method === "online"`.

### Schema

Cek dulu apakah kolom `payment_method` sudah ada di `bookings`. Jika belum, migration tambah:
```sql
ALTER TABLE bookings ADD COLUMN payment_method TEXT
  CHECK (payment_method IN ('onsite','transfer','online'));
```

---

## 2. Upload Bukti Transfer/QRIS gating

**`src/pages/MyBooking.tsx` line 434-482**

Kondisi render section bukti dirapikan jadi:

```text
const canUploadProof =
  isOwner &&
  booking.status === "confirmed" &&
  booking.payment_method === "transfer" &&
  booking.payment_status !== "paid";
```

- Jika `latestProof` sudah ada → tetap tampilkan kartu status bukti (review/disetujui/ditolak).
- Jika belum ada bukti dan `!canUploadProof` → section tidak dirender sama sekali (hilangkan tombol upload prematur seperti di screenshot kedua).
- Pesan helper "Pembayaran dapat dilakukan setelah booking dikonfirmasi admin…" tetap ditampilkan saat `!payAllowed`, tapi bagian "Upload" disembunyikan total.

---

## 3. Fix layout mobile `StaffQuickBookingDialog` step 4

**`src/components/admin/StaffQuickBookingDialog.tsx` line 559-604**

Masalah dari screenshot:
- Label "Time" + badge "3/3 sisa" overflow di `SelectValue` (terpotong "08:…").
- Kolom 2 (Time) terlalu sempit di mobile, Next button glow overlap Time field.

Perbaikan:
1. Ganti `grid-cols-2` → `grid grid-cols-1 sm:grid-cols-2 gap-3` agar Date & Time stacked di mobile (~<640px).
2. Di `SelectValue` Time trigger: hanya tampilkan jam (tanpa info sisa). Info `3/3 sisa` cukup di dalam dropdown item.
3. Tambah `min-w-0` di `<div className="grid gap-2">` Time supaya truncate bekerja.
4. Tombol action bar (Back/Next, line 601-604): tambah `pt-2` & `gap-3`, dan bungkus dengan `sticky bottom-0 bg-background pt-3` agar tidak collide dengan field di atasnya saat scroll pada layar pendek.
5. `DialogContent` di `Dialog` wrapper: pastikan `max-h-[90vh] overflow-y-auto` (cek bagian atas file) untuk dialog mobile.

Konsistensi: terapkan fix layout grid yang sama di `src/components/admin/QuickBookingDialog.tsx` line 242-266 (struktur identik).

---

## Detail teknis

- **DB**: cek & tambah kolom `payment_method` jika belum ada via migration.
- **Realtime**: `useBooking` sudah subscribe via realtime — picker akan auto-show ketika admin set `status=confirmed`.
- **Aktifitas log**: pemilihan metode bayar oleh customer ditulis ke `activity_logs` (action: `payment_method_selected`).
- **i18n / copy**: semua label baru pakai Bahasa Indonesia ("Konfirmasi Pesanan Booking", "Pilih Metode Pembayaran", "Bayar di Tempat", "Transfer / QRIS", "Bayar Online").
- **Tidak menyentuh**: PaymentDialog (Midtrans), flow admin verifikasi bukti, struktur status booking.

---

## Catatan diskusi tambahan (rekomendasi)

- **Email/WA notifikasi**: setelah customer konfirmasi pesanan, kirim notifikasi "Pesanan Anda sedang ditinjau". Bisa ditambah di tahap berikut, di luar scope plan ini.
- **Reminder belum pilih metode**: kalau status `confirmed` >2 jam tanpa `payment_method`, kirim push reminder. Out of scope, catatan untuk iterasi.
- **Mobile QuickBooking**: opsi lanjutan ubah dialog jadi `Sheet` (drawer) di mobile — lebih native. Belum diimplementasi di plan ini agar minimal-invasive.
