
## Goal

Setelah admin/staff sukses membuat booking via Quick Booking, dialog tidak langsung tertutup. Tampilkan **Booking Confirmation Card** dengan:
- Ringkasan booking (customer, servis, tanggal/jam, cabang, kendaraan)
- **Public tracking link** `https://bengkelstroban.com/t/<public_track_token>`
- Tombol **Bagikan via WhatsApp** (buka `wa.me/<phone>?text=...` prefilled, nomor customer dinormalisasi ke 62…)
- Tombol **Salin Link** (copy ke clipboard + toast "Link disalin")
- Tombol **Tutup** dan **Buat Booking Baru** (reset wizard)

Link mengarah ke page `/t/:token` yang sudah ada (`PublicBookingTracker.tsx`) — tidak ada perubahan flow tracking.

## Scope

Hanya UI presentasi di 2 dialog. Tidak ada perubahan DB/edge function/RLS/RPC. Token sudah otomatis di-generate trigger `BEFORE INSERT` di P1, jadi cukup ambil balik dengan `.select("id, public_track_token")`.

## Changes

### 1. `src/components/admin/StaffQuickBookingDialog.tsx`
- Ubah `.select("id")` → `.select("id, public_track_token")`.
- Tambah state `createdBooking: { id, token, summary } | null`.
- Setelah insert sukses: simpan ke state, **JANGAN** `onOpenChange(false)`. Set `step` ke nilai baru `5` (confirmation) atau render conditional panel saat `createdBooking` ada.
- Render `<BookingShareCard />` (komponen baru, lihat #3) di dalam DialogContent dengan props customer/service/date/time/branch/vehicle/token/phone.
- Tombol "Buat Booking Baru" → reset semua state wizard (`step=1`, clear selections, `createdBooking=null`).
- Tombol "Selesai" → `onOpenChange(false)` + reset state.
- Notif WA otomatis (`notify-booking-status`) tetap berjalan paralel — tidak diubah. Link share di kartu adalah jalur manual untuk admin.

### 2. `src/components/admin/QuickBookingDialog.tsx`
- Pola sama persis dengan #1 (select token, simpan booking, render share card sebagai step terakhir, opsi tutup/baru).

### 3. `src/components/admin/BookingShareCard.tsx` (baru)
- Komponen presentasional reusable.
- Props: `{ bookingId, token, customerName, customerPhone, serviceName, date, time, branch, vehicleLabel, onClose, onCreateAnother }`.
- Build URL: `const trackUrl = \`https://bengkelstroban.com/t/${token}\``. Fallback ke `window.location.origin + '/t/' + token` jika token absent (defensive, tampilkan warning).
- Build WA message (id):
  ```
  Halo {firstName}, booking servis Anda di Sahabat Stroban Service sudah dibuat.

  Servis : {serviceName}
  Tanggal: {date} {time}
  Cabang : {branch}
  Kendaraan: {vehicleLabel}

  Lacak status real-time (link 1× pakai — jangan dibagikan):
  {trackUrl}

  Butuh bantuan? Balas pesan ini.
  ```
- Normalisasi phone: helper local — strip non-digit, jika diawali `0` → ganti `62`, jika diawali `8` → prefix `62`, jika sudah `62` biarkan. Jika kosong → sembunyikan tombol WA, hanya tampilkan Copy.
- Tombol "Bagikan via WhatsApp": `window.open(\`https://wa.me/${phone62}?text=${encodeURIComponent(msg)}\`, '_blank')`.
- Tombol "Salin Link": `navigator.clipboard.writeText(trackUrl)` + sonner toast.
- Tombol "QR Code" (opsional, low priority — skip kecuali user minta).
- Tampilkan URL sebagai readonly `<Input>` dengan ikon copy di kanan.
- Badge kecil "Link 1× pakai (tracking publik)" untuk komunikasi ke admin.

## Out of Scope

- Tidak menambah expiry / single-use enforcement di backend. Token sudah unik per booking; "1× pakai" hanya copy/komunikasi UX (link tetap valid selama booking aktif). Bila user mau hard single-use, lakukan di iterasi berikut (perlu kolom `track_token_used_at` + RPC check).
- Tidak mengubah `notify-booking-status` (WA otomatis tetap kirim link yang sama).
- Tidak mengubah `PublicBookingTracker.tsx`.

## Files

- NEW: `src/components/admin/BookingShareCard.tsx`
- EDIT: `src/components/admin/StaffQuickBookingDialog.tsx`
- EDIT: `src/components/admin/QuickBookingDialog.tsx`
