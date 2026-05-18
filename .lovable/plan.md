# Perbaikan 3 Temuan Verifikasi Google OAuth

Pesan di gambar berasal dari **Google Cloud Console → OAuth consent screen → Branding verification**. Google menolak karena 3 alasan. Berikut perbaikan masing-masing.

---

## 1. "Home page URL https://bengkelstroban.com is not registered to you"

**Arti:** Google belum bisa membuktikan bahwa pemilik project Google Cloud yang sama juga memiliki domain `bengkelstroban.com`.

**Solusi (di luar kode — wajib dilakukan user):**
1. Buka **Google Search Console** → https://search.google.com/search-console
2. Add property → **Domain** (bukan URL prefix) → masukkan `bengkelstroban.com`
3. Verifikasi via **DNS TXT record** (Google akan beri token TXT, tambahkan di registrar domain Anda).
4. Setelah verified di Search Console, **pastikan akun Google yang sama** (yang verified) adalah pemilik project Google Cloud OAuth.
5. Kembali ke OAuth Branding → tekan **"I have fixed the issues"**.

> Tanpa langkah ini, Google tidak akan pernah meloloskan verifikasi — tidak ada cara via kode.

---

## 2. "Privacy policy URL is the same as home page URL"

**Arti:** Saat ini Anda mengisi `https://bengkelstroban.com` di kolom Privacy Policy. Google mewajibkan URL **terpisah dan dedicated** untuk privacy policy.

**Solusi (gabungan kode + Google Console):**

Cek di project — sudah ada halaman legal di `src/pages/LegalPage.tsx`. Saya akan:
- Memastikan route publik dedicated **`/legal/privacy-policy`** aktif & berisi konten privacy policy lengkap (nama bisnis, data yang dikumpulkan dari Google login: email, nama, foto profil; cara penggunaan; cara hapus akun; kontak).
- Memastikan route **`/legal/terms-of-service`** juga aktif (Google sering minta TOS terpisah).
- Menambahkan link Privacy Policy & TOS di footer agar Google crawler menemukannya.
- Memastikan kedua URL **publik** (tidak butuh login) & **HTTPS**.

Setelah deploy, isi di Google OAuth Branding:
- Privacy policy URL: `https://bengkelstroban.com/legal/privacy-policy`
- Terms of service URL: `https://bengkelstroban.com/legal/terms-of-service`
- Application home page: `https://bengkelstroban.com`

---

## 3. "Logo does not uniquely identify your brand and identity"

**Arti:** Logo yang Anda upload ke Google OAuth Branding dianggap generic / mirip brand lain / tidak mengandung wordmark "Sahabat Stroban Service".

**Solusi (di luar kode):**
- Gunakan logo **resmi Sahabat Stroban Service** yang mengandung:
  - Wordmark "Sahabat Stroban" atau "Bengkel Stroban" terbaca jelas
  - Format **PNG transparan, square 120x120 px minimum**
  - **Bukan** ikon mobil generic / icon stock
- Upload logo baru tersebut di Google OAuth Branding (bukan di app Lovable — Google punya kolom sendiri).
- Pastikan logo yang sama juga dipakai di `/dashboard/marketing/branding` agar konsisten (sudah ada panel-nya).

> Tip: logo dengan teks brand jauh lebih mudah lolos dibanding logo simbol saja.

---

## File yang akan diubah di project (untuk poin #2)

- `src/pages/LegalPage.tsx` — pastikan slug `privacy-policy` & `terms-of-service` punya konten lengkap & OAuth-compliant (mencakup: data Google yang dikumpulkan, tujuan, retensi, hak user, kontak).
- `src/App.tsx` — verifikasi route `/legal/:slug` publik (tidak di-wrap ProtectedRoute).
- `src/components/Footer.tsx` — tambahkan link Privacy Policy & Terms agar ditemukan crawler.
- (opsional) Update meta `<title>` & `<meta name="description">` di kedua halaman supaya Google index dengan jelas.

## Yang TIDAK bisa diperbaiki via kode

- Poin **#1 (domain ownership)** → wajib via Google Search Console DNS TXT.
- Poin **#3 (logo)** → wajib upload logo brand baru di Google Cloud Console.

Setelah saya selesaikan poin #2, Anda lakukan #1 + #3 di Google Console lalu klik **"I have fixed the issues"** → **Proceed**.

---

Lanjutkan dengan implementasi poin #2 (privacy policy + terms page + footer link)?
