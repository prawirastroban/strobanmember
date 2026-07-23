# Rename Brand: Sahabat Stroban → Bengkel Mobil Stroban

## Scope
Ganti setiap kemunculan teks brand "Sahabat Stroban" (dan variasi seperti "Sahabat Stroban Service") menjadi "Bengkel Mobil Stroban" di seluruh proyek. Domain (`bengkelstroban.com`), nomor WA, dan kata "Stroban" tunggal tidak diubah.

## Perubahan

### 1. Frontend (React) — 46 file
Global replace case-preserving pada literal:
- `Sahabat Stroban Service` → `Bengkel Mobil Stroban Service`
- `Sahabat Stroban` → `Bengkel Mobil Stroban`

File utama yang terdampak (subset):
- `src/hooks/useBranding.ts` — default `brand_name`, `siteTitle`
- `src/components/SEOMeta.tsx` — `BRAND` konstan + semua meta per-route
- `src/i18n/id.ts`, `src/i18n/en.ts` — string i18n
- `src/pages/*` — Auth, Booking, Profile, LegalPage, ClaimAccount, PublicReviewForm, PublicBookingTracker
- `src/components/*` — Hero, MobileHero, MobileNav, DesktopSidebar, admin/*, spk/SPKShareCard, referral/ReferralTermsDialog, dll
- `index.html` — `<title>`, meta description, og:*, JSON-LD Organization `name`

### 2. Static assets
- `public/manifest.webmanifest` — `name`, `short_name`
- `public/offline.html`, `public/llms.txt`, `README.md`

### 3. Edge Functions (Supabase)
Ganti nama pengirim / template pesan di:
- `notify-booking-status`, `wa-password-reset`, `service-consultation`, `send-review-reminders`, `phone-otp-login`, `register-push-token`, `admin-user-ops`, `chat`
Re-deploy semua fungsi terpengaruh.

### 4. Database — `app_branding`
Migration untuk update baris `id = 1`:
```sql
UPDATE public.app_branding
SET brand_name = 'Bengkel Mobil Stroban',
    site_title = 'Bengkel Mobil Stroban - Servis Mobil & Loyalty Rewards',
    updated_at = now()
WHERE id = 1;
```
Ini menimpa nilai runtime yang di-load `useBranding` (fallback default juga sudah ikut diperbarui di kode).

### 5. Migrasi lama
File `supabase/migrations/*.sql` yang lama (historis) **tidak diedit** — hanya migration baru yang menyesuaikan data live.

## Yang TIDAK diubah
- Domain `bengkelstroban.com` dan subdomain
- Nomor WhatsApp `+62 897-3700-800`
- Nama teknis "STROBAN" pada header SPK Canvas / logo file
- Konten memory `mem://` (referensi historis)

## Verifikasi
- `rg -i "sahabat stroban"` harus 0 hasil (kecuali migrations lama).
- Buka homepage → title, hero, footer memuat "Bengkel Mobil Stroban".
- Cek notifikasi WA test (booking status) memakai nama baru.
