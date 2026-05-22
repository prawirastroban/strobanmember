## Tujuan
Mendorong setiap user yang belum mengisi nomor WhatsApp (kolom `phone` di profil) agar segera melengkapinya, supaya bisa menerima notifikasi booking, reminder, dan reset password via WA.

## Yang akan dibangun

### 1. Hook deteksi: `useMissingWhatsApp`
- Membaca `profiles.phone` user yang sedang login.
- Mengembalikan `{ isMissing, loading, phone }`.
- Realtime: ikut update jika user baru menyimpan nomor di Profile.

### 2. Banner global "Lengkapi nomor WhatsApp"
Komponen `WhatsAppReminderBanner` yang muncul di atas konten utama (di bawah Navbar) untuk user login yang `phone` masih kosong.

Isi banner:
- Ikon WhatsApp + judul: "Lengkapi nomor WhatsApp Anda"
- Sub-teks: "Agar bisa menerima konfirmasi booking, reminder service, dan reset password lewat WhatsApp."
- Tombol primer: "Isi Sekarang" → arahkan ke `/profile` (langsung fokus ke input phone via hash `#phone`).
- Tombol "Nanti saja" → dismiss sementara (disimpan di `localStorage` selama 24 jam, supaya tidak mengganggu tiap reload tapi tetap muncul lagi besok).

Tampil di:
- Halaman publik utama (Index, Katalog, Promo, MyBooking, ReminderService, Loyalty, dll) — diintegrasikan satu kali di `App.tsx` setelah Navbar.
- Tidak tampil di: halaman auth (`/auth`, `/reset-password`), halaman admin (`/dashboard/*`), dan halaman publik review form.

### 3. Hard-gate sebelum booking (pengingat lebih kuat)
Di alur `Booking.tsx` / `MobileBookingWizard.tsx`: jika user login tapi `phone` kosong, tampilkan dialog "Nomor WhatsApp wajib diisi sebelum booking" dengan tombol "Lengkapi Sekarang" yang membuka inline form (atau redirect `/profile#phone`). Tombol submit booking di-disable sampai phone terisi.

### 4. Highlight di halaman Profile
- Saat Profile dibuka dengan hash `#phone` atau saat `phone` masih kosong:
  - Auto-scroll & focus ke input phone.
  - Tambah ring/glow merah neon (sesuai brand) + helper text "Wajib diisi untuk menerima notifikasi".

### 5. Badge kecil di menu profil / dropdown
Titik merah kecil (notification dot) di avatar/menu profil saat `phone` belum diisi, supaya user yang menutup banner tetap melihat indikasi.

## Detail teknis
- Sumber data: `supabase.from('profiles').select('phone').eq('id', user.id)`.
- Tidak butuh perubahan skema DB — kolom `phone` di `profiles` sudah ada.
- Dismiss state: `localStorage.setItem('wa_reminder_dismissed_until', timestamp)`.
- File baru:
  - `src/hooks/useMissingWhatsApp.ts`
  - `src/components/WhatsAppReminderBanner.tsx`
- File yang disesuaikan:
  - `src/App.tsx` (mount banner global)
  - `src/pages/Profile.tsx` (auto-focus + highlight saat kosong)
  - `src/pages/Booking.tsx` + `src/components/booking/MobileBookingWizard.tsx` (hard-gate)
  - `src/components/Navbar.tsx` / dropdown profil (notification dot)

## Out of scope
- Tidak mengubah skema database.
- Tidak mengirim email/WA blast — hanya pengingat di dalam aplikasi.
