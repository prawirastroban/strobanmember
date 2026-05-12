## Lanjutan Sistem Referral

### 1. Sidebar Admin — menu "Referral & Komisi"
File: `src/components/admin/AdminSidebar.tsx`
- Tambah item baru di group **Keuangan** (staff-only): `Referral & Komisi` → `/dashboard/keuangan/referral`, icon `Users` atau `Share2`.

### 2. Auth flow — attach referrer otomatis
File: `src/pages/AuthCallback.tsx` & `src/pages/Auth.tsx`
- Setelah session aktif & profile dipastikan ada, baca `localStorage.pending_ref_code`.
- Jika ada → panggil RPC `attach_referrer({ _code })` lalu hapus key dari localStorage.
- Tangani error secara silent (tidak block login).

### 3. Capture `?ref=` di root
File: sudah ada `ReferralCapture` di `src/App.tsx` (cek ulang).

### 4. Tampilkan kode referral di `/profile`
File: `src/pages/Profile.tsx`
- Fetch tambahan: `referral_code`, `is_verified` dari `profiles`.
- **Card baru** "Program Referral" di antara hero card dan menu list:
  - Jika `is_verified = true` & `referral_code` ada:
    - Tampilkan kode (`REF-XXXXXX`) dengan tombol **Copy** dan tombol **Bagikan WA** (link `https://wa.me/?text=...`).
    - Subtext: "Ajak teman & dapatkan komisi tiap booking lunas."
    - Tombol "Lihat Saldo & Tarik" → `/referral`.
  - Jika **belum verified**: tampilkan info "Verifikasi akun untuk dapat kode referral" + link ke verifikasi.
- Style: rounded-2xl glass card, accent `#ff2b2b`, mengikuti pola Apple-style yang ada.

### 5. Item menu baru di Profile menu list
- Tambah row "Program Referral" di Card menu (di atas Loyalitas) dengan icon `Share2`, tint primary, target `/referral`.

### Detail Teknis
- RPC `attach_referrer` dipanggil via `supabase.rpc('attach_referrer', { _code })`. Tidak ada error fatal jika user sudah punya referrer / kode invalid.
- Format kode tampil: monospace, uppercase, dalam pill `bg-muted/60 border`.
- Copy via `navigator.clipboard.writeText` + toast konfirmasi.
- Share WA: text "Servis mobil di Sahabat Stroban yuk! Pakai kode {CODE} atau link: https://www.bengkelstroban.com/?ref={CODE}".

### File yang disentuh
- `src/components/admin/AdminSidebar.tsx` (menu)
- `src/pages/AuthCallback.tsx` (attach)
- `src/pages/Auth.tsx` (attach setelah email/phone login)
- `src/pages/Profile.tsx` (kartu referral + menu row)

Tidak ada perubahan database — semua sudah siap dari migration sebelumnya.
