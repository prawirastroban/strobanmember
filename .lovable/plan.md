## Tambah Input Kode Referral pada Form Daftar

### Yang sudah ada
- `?ref=CODE` di URL otomatis tersimpan ke `localStorage.pending_ref_code` (lihat `ReferralCapture` di `App.tsx`).
- Saat user login/signup berhasil, kode di localStorage dipakai memanggil RPC `attach_referrer` (lihat `Auth.tsx` & `AuthCallback.tsx`).
- Yang **belum ada**: input kode referral manual di form daftar untuk user yang dapat kode dari teman tanpa klik link.

### Perubahan UI di `src/pages/Auth.tsx`

1. State baru `signupReferralCode` (string).
2. Saat `Tabs` aktif di "Daftar", baca `localStorage.pending_ref_code` sekali → prefill `signupReferralCode` (uppercase).
3. Tambah field **"Kode Referral (opsional)"** di form daftar (di bawah field telepon/email):
   - Input monospace, uppercase otomatis (`onChange` → `value.toUpperCase()`), maxLength 20, regex `^[A-Z0-9-]*$`.
   - Placeholder: `Contoh: ABC123`.
   - Helper text:
     - Jika prefilled dari URL → badge hijau kecil: `Otomatis terisi dari link referral` + tombol kecil "Hapus".
     - Jika kosong → caption: `Punya kode dari teman? Masukkan untuk dapatkan bonus.`
4. Pada `handleSignup` sebelum `signUp(...)`:
   - Jika `signupReferralCode` valid (≥ 3 karakter), simpan ke `localStorage.pending_ref_code` (overwrite). Flow `attach_referrer` existing akan menanganinya setelah login pertama.
   - Jika user mengosongkan field padahal ada nilai di localStorage → hapus localStorage (anggap user tidak ingin pakai).
5. Sama seperti di atas, tombol Google sign-in juga tetap bekerja karena `pending_ref_code` sudah tersimpan sebelum redirect OAuth.

### Tidak diubah
- `App.tsx` ReferralCapture tetap aktif untuk auto-capture link `?ref=`.
- `AuthCallback.tsx` & redirect logic tidak berubah.
- Tidak ada perubahan database.

### File yang disentuh
- `src/pages/Auth.tsx` saja.
