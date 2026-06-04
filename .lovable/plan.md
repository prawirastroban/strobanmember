## Tujuan
Wajibkan setiap akun mengisi nomor WhatsApp. Tanpa nomor WA, user tidak bisa mengakses fitur penting (booking, checkout, dll) dan akan terus diarahkan untuk melengkapi.

## Perubahan

### 1. Global gate — Modal wajib (tidak bisa di-dismiss)
Ganti `WhatsAppReminderBanner` (yang bisa ditutup 24 jam) dengan komponen baru `WhatsAppRequiredGate.tsx`:
- Tampil sebagai **Dialog modal** non-dismissible saat user login & `phone` kosong/<8 digit.
- Hanya muncul di halaman publik & user (skip `/auth`, `/reset-password`, `/admin`).
- Input nomor WA langsung di modal (prefix +62, validasi minimal 8 digit angka).
- Tombol "Simpan & Lanjutkan" → update `profiles.phone` → tutup modal.
- Tombol sekunder hanya "Keluar" (sign out) — tidak ada "nanti saja".

### 2. Hard guard di action kritis
Di titik aksi penting, blokir jika WA kosong dan buka modal di atas:
- `Booking.tsx` / `MobileBookingWizard` — sebelum submit booking.
- Checkout pembayaran (`midtrans-create-cart-checkout` trigger di FE).
- Klaim promo/voucher & redeem reward.

Gunakan helper `useRequireWhatsApp()` yang membungkus `useMissingWhatsApp` + buka gate modal.

### 3. Signup flow
- `src/pages/Auth.tsx`: jadikan field nomor WA **wajib** di form sign up (email & Google).
  - Untuk Google OAuth: setelah callback, jika `phone` kosong → gate modal otomatis muncul (sudah ter-cover via #1).
  - Untuk email signup: tambahkan field phone required dengan validasi Zod (min 8, format angka).
- `signup-precheck` edge function: tetap, tidak perlu ubah server-side (kolom phone sudah ada di `profiles`).

### 4. Profile page
- `Profile.tsx`: badge "Wajib diisi" tetap, tapi tombol close dialog dihilangkan saat phone kosong.

### 5. Cleanup
- Hapus penggunaan `WhatsAppReminderBanner` dari `App.tsx`, ganti dengan `WhatsAppRequiredGate`.
- Hapus key `wa_reminder_dismissed_until` dari localStorage (tidak relevan lagi).

## File yang akan diubah/dibuat
- **Baru**: `src/components/WhatsAppRequiredGate.tsx`, `src/hooks/useRequireWhatsApp.ts`
- **Edit**: `src/App.tsx`, `src/pages/Auth.tsx`, `src/pages/Profile.tsx`, `src/pages/Booking.tsx`, `src/components/booking/MobileBookingWizard.tsx`, titik checkout/redeem terkait
- **Hapus**: `src/components/WhatsAppReminderBanner.tsx`, `src/hooks/useMissingWhatsApp.ts` (digabung ke hook baru)

## Catatan
- Tidak ada perubahan skema DB — kolom `profiles.phone` sudah tersedia.
- User existing tanpa nomor WA akan langsung melihat modal saat login berikutnya.
- Admin/staff juga wajib (kecuali Anda ingin dikecualikan — beri tahu saya).
