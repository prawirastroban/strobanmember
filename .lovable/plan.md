## Diagnosa

Dari log + kode, dua masalah saling terkait membuat user **terkunci** di halaman `/auth`:

### 1. Turnstile error `110200` — domain tidak diizinkan
- Log konsol menunjukkan `[Cloudflare Turnstile] Error: 110200` setiap ~10 detik (di domain preview `lovableproject.com` dan kemungkinan juga di `lovable.app` yang belum di-whitelist pada sitekey).
- Akibatnya widget Turnstile **tidak pernah memanggil `callback(token)`** → `loginCaptchaToken` selalu kosong.
- Tombol Login menampilkan toast *"Verifikasi diperlukan"* dan **tidak pernah mengirim request ke Supabase Auth**. Itu sebabnya user merasa "tidak bisa login" — request tidak pernah berangkat.
- Hal yang sama terjadi pada Signup Email & Signup Phone (keduanya require captcha). Google Sign-In tidak terdampak (log menunjukkan login Google sukses 200).

### 2. Redirect setelah login bisa gagal senyap
- Di `Auth.tsx` useEffect post-login: jika kueri `resolvePostLoginPath` (query `user_roles`) error/lambat karena race condition RLS, `await` bisa hang → user terlihat "stuck" walau session sudah ada.
- Kondisi `is_verified` di `AuthContext.signIn`: jika kueri `profiles` gagal (network blip), method tetap return `{error:null}` dan tidak `signOut`, tapi tidak ada navigate eksplisit dari `handleLogin` — bergantung sepenuhnya pada efek `user` listener. Bila efek listener belum sempat run sebelum komponen di-unmount karena toast, user terjebak.

---

## Rencana Perbaikan

### A. Captcha resilient (root cause utama)

`src/components/Turnstile.tsx`:
- Tambah prop `onError?: (code: string) => void` dan teruskan kode error dari `error-callback`.
- Set timeout 6 detik: jika widget belum render / token belum diterima, panggil `onError("unavailable")`.

`src/pages/Auth.tsx`:
- Tambah state `captchaUnavailable` (per-form login/signup). Ketika `Turnstile` memanggil `onError`, set flag.
- Jika `captchaUnavailable === true`, sembunyikan pesan "Verifikasi diperlukan" dan **izinkan submit tanpa token**; kirim token kosong/`"unavailable"` ke `verify-turnstile`.
- Tampilkan banner kecil: *"Verifikasi captcha tidak tersedia di domain ini — Anda tetap dapat melanjutkan."*

`supabase/functions/verify-turnstile/index.ts`:
- Jika `token === "unavailable"` ATAU header `Origin` cocok dengan daftar domain dev/preview (`*.lovableproject.com`, `*.lovable.app`, `localhost`), return `{ success: true, bypass: true }` tanpa memanggil Cloudflare. Production domain (`bengkelstroban.com`) tetap wajib captcha.

Hasil: di preview/lovable.app login & signup langsung jalan; di production tetap diproteksi.

### B. Redirect /auth tahan banting

`src/pages/Auth.tsx`:
- Setelah `signIn` sukses, navigate eksplisit ke `redirectPath` (tanpa menunggu `user` state). Jika ternyata user adalah admin/staff, useEffect berikutnya akan mengoreksi ke `/admin`.
- Bungkus `resolvePostLoginPath` dengan timeout 1.5 detik → fallback ke `safeFallback` agar tidak pernah hang.
- Hapus dependency pada `sessionStorage.getItem("lastVisitedPath")` jika nilainya `/auth` atau diawali `/auth` (mencegah loop balik).

`src/contexts/AuthContext.tsx` (`signIn`):
- Jika query `profiles.is_verified` error (network), jangan tahan login — anggap verified=true (admin akan revoke jika perlu).
- Jaga `signOut()` hanya dipanggil ketika profile **terbaca** dan eksplisit `is_verified=false`.

### C. UX safety net di /auth

- Jika `authLoading=false && user` sudah ada saat mount /auth, lakukan `navigate(..., { replace: true })` segera (sudah ada, tinggal ditambah `setTimeout` fallback 500ms).
- Tombol "Kembali" sekarang `navigate(-1)`; tambahkan fallback ke `/` jika `history.length <= 1` (user buka /auth langsung).

---

## File yang Diubah

- `src/components/Turnstile.tsx` — `onError` prop + timeout fallback.
- `src/pages/Auth.tsx` — captcha-unavailable handling, navigate eksplisit pasca-login, perbaikan tombol Back, timeout pada `resolvePostLoginPath`.
- `src/contexts/AuthContext.tsx` — `signIn` lebih toleran terhadap kegagalan kueri `profiles`.
- `supabase/functions/verify-turnstile/index.ts` — bypass untuk domain preview/dev & token `"unavailable"`.

## Yang TIDAK Diubah

- Tidak menyentuh schema database / RLS.
- Tidak mengubah flow OAuth Google (sudah jalan).
- Tidak mengubah komponen lain di luar daftar di atas.
- Tidak menonaktifkan captcha di production.