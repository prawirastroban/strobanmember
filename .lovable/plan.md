# Plan: Audit dan perbaikan flow penambahan user baru

## Masalah yang ditemukan
Ada indikasi kuat bahwa seluruh flow akun berbasis nomor HP memakai email virtual seperti `628xxxx@phone.local`, sementara auth sekarang menolak format domain itu dengan error:
`Unable to validate email address: invalid format`

Dampaknya bisa kena ke beberapa jalur sekaligus:
- Signup publik via nomor HP/WA
- Login publik via nomor HP/WA
- Buat customer dari dashboard staff/admin jika email tidak valid atau flow reset menganggap email virtual itu email sungguhan
- Beberapa helper seperti reset password WA yang masih mencari user memakai pola email virtual lama

Selain itu, signup publik saat ini juga diblok oleh guard `duplicate_signup_ip`, jadi saya perlu audit agar false-positive dari WiFi bersama/kantor tidak ikut memutus semua role dari pendaftaran user baru.

## Yang akan saya perbaiki
1. Normalisasi strategi identitas akun berbasis HP
- Ganti generator email virtual ke format yang valid untuk auth, misalnya domain placeholder yang lolos validasi.
- Samakan format ini di semua tempat yang saat ini masih memakai `@phone.local`.

2. Audit dan perbaiki seluruh flow terkait akun baru
- Signup publik di halaman `/auth`
- Login publik via nomor HP
- Login/signup pada `LoginDialog`
- Pembuatan customer oleh staff/admin dari dashboard
- Reset password via WhatsApp
- Cek email valid vs email virtual di dashboard customer

3. Audit edge function admin user ops
- Pastikan `create_customer` aman bila staff membuat akun baru tanpa bentrok dengan validasi email.
- Pastikan flow reset password tidak salah menganggap email virtual sebagai email normal.

4. Audit pembatasan signup IP
- Telusuri apakah guard `signup-precheck` terlalu agresif dan memblok signup baru di jaringan bersama.
- Jika perlu, ubah supaya pencegahan abuse tetap ada tetapi tidak mematikan operasional pendaftaran normal.

5. Validasi hasil akhir
- Pastikan flow berikut kembali jalan:
  - daftar email
  - daftar nomor HP
  - login nomor HP
  - Google signup/login
  - staff buat akun customer
  - reset password WA/email
- Pastikan akun baru tetap membuat profile, role default customer, dan status verifikasi sesuai flow yang ada.

## File yang kemungkinan disentuh
- `src/pages/Auth.tsx`
- `src/components/LoginDialog.tsx`
- `src/components/admin/StaffQuickBookingDialog.tsx`
- `src/components/admin/CustomerList.tsx` bila perlu penyesuaian valid-email detection
- `supabase/functions/admin-user-ops/index.ts`
- `supabase/functions/wa-password-reset/index.ts`
- `supabase/functions/signup-precheck/index.ts` bila audit IP block membuktikan itu penyebab utama
- kemungkinan util/helper kecil baru bila perlu sentralisasi generator email virtual

## Detail teknis
Saya akan pakai satu format email virtual yang valid dan konsisten, lalu audit semua pembacaan/pengecekan yang masih hardcoded ke suffix lama.

Contoh arah perbaikan:
```text
phone number -> normalized E.164-ish digits -> valid synthetic email
           -> dipakai konsisten untuk signup/login/reset/admin-create
```

Saya juga akan cek agar flow customer buatan staff tetap aman:
- email asli tetap dipakai bila memang ada
- akun berbasis nomor HP tetap bisa dibuat tanpa error auth
- reset password memilih kanal yang benar sesuai jenis akun

## Hasil yang diharapkan
Setelah implementasi:
- user baru bisa dibuat lagi
- semua role bisa membantu membuat akun customer baru
- signup publik tidak mentok 400 invalid email format
- akun nomor HP tetap kompatibel dengan flow lama semaksimal mungkin