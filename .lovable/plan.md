## Tujuan
Menghilangkan halaman "Grant permission to Stroban Membership" milik `oauth.lovable.app` (perantara Lovable). Setelah selesai, klik tombol "Login dengan Google" akan **langsung** ke halaman pilih akun Google milik Stroban — tanpa halaman perantara apapun.

> Catatan: Halaman Google sendiri ("Pilih akun" / "Continue") **wajib tetap ada** — itu aturan keamanan Google yang tidak bisa dihapus aplikasi manapun. Yang bisa kita hilangkan hanya halaman perantara Lovable.

## Apa yang Perlu Anda Siapkan (1x setup, ±10 menit)

Anda perlu membuat OAuth credentials di **Google Cloud Console** lalu kasih ke saya 2 nilai ini:
1. **Client ID** (format: `xxxxx.apps.googleusercontent.com`)
2. **Client Secret** (format: `GOCSPX-xxxxx`)

### Langkah singkat di Google Cloud Console:
1. Buka https://console.cloud.google.com/ → Buat project baru "Stroban Membership"
2. **APIs & Services → OAuth consent screen** → pilih External → isi:
   - App name: `Sahabat Stroban Service`
   - Logo: upload logo Stroban
   - Support email & domain: `bengkelstroban.com`
   - Authorized domain: `bengkelstroban.com`, `lovable.app`
3. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - Type: **Web application**
   - Authorized redirect URI: `https://yrwttzxrnomaiqxyjrqn.supabase.co/auth/v1/callback`
4. Copy **Client ID** & **Client Secret** → kirim ke saya

## Apa yang Saya Lakukan (otomatis setelah Anda kasih kredensial)

1. Masukkan Client ID & Secret ke Lovable Cloud Auth Settings (provider Google → "Use your own credentials").
2. Verifikasi flow login Google dari halaman `/auth` & dialog login.
3. Pastikan tidak ada perubahan kode yang dibutuhkan — implementasi `signInWithOAuth('google')` yang ada sekarang otomatis pakai kredensial baru.

## Hasil Akhir

**Sebelum:** Klik Google → `oauth.lovable.app` (Grant permission to Stroban Membership) → Google → kembali ke app
**Sesudah:** Klik Google → langsung Google (logo & nama "Sahabat Stroban Service") → kembali ke app

User cuma lihat 1 halaman Google asli dengan branding Stroban. Cepat, profesional, terpercaya.

## Detail Teknis (untuk referensi)

- File yang terlibat: tidak ada perubahan kode. Semua konfigurasi via Lovable Cloud Auth Settings UI.
- Implementasi sekarang: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ... } })` — tetap sama, hanya backend credential yang ganti.
- Redirect URI Supabase tetap sama; cukup didaftarkan di Google Cloud Console.
- Existing user yang sudah login pakai Google sebelumnya → akun mereka tetap utuh (Supabase identifikasi via email Google, bukan via Client ID).

## Pertanyaan Sebelum Mulai

Apakah Anda siap membuat kredensial di Google Cloud Console sekarang? Atau Anda mau saya tetap pakai opsi managed Lovable (tetap ada halaman perantara) sambil memikirkan ini lain hari?
