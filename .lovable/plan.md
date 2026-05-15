# Rencana Hardening Keamanan Bengkel Stroban

Catatan: Pada "Scope Cloning" Anda memilih *"Tidak perlu, fokus keamanan saja"*, jadi paket Anti-Cloning saya **lewati** dan fokus ke 3 pilar keamanan backend.

---

## 1. Hardening Dasar (wajib)

### 1.1 Aktifkan Leaked Password Protection
Aktifkan HIBP check di Supabase Auth lewat `configure_auth(password_hibp_enabled: true)`. Password yang sudah pernah bocor di internet akan ditolak saat signup / ganti password.

### 1.2 Audit RLS otomatis
Jalankan `supabase--linter` untuk scan otomatis semua tabel. Perbaiki issue yang muncul (function search_path, missing RLS, dll). Saya juga akan periksa ulang policy berikut yang berisiko:
- `booking_status_logs` insert policy mengandung `OR true` → akan diperketat ke staff/admin saja.
- `notifications` — pastikan user tidak bisa baca notif user lain (sudah aman, tapi perlu konfirmasi).
- `profiles` — pastikan kolom phone/email user lain tidak terekspos via join publik.

### 1.3 CAPTCHA di Auth
Pasang **Cloudflare Turnstile** (gratis, privacy-friendly) di:
- Halaman `/auth` (signup & login)
- Form `/legal/contact-complaint` (sudah public-insert ke `customer_complaints`)

Validasi token Turnstile dilakukan via edge function baru `verify-turnstile` sebelum proses lanjut. Butuh secret: `TURNSTILE_SECRET_KEY` (siteKey publik di kode).

### 1.4 Security headers
Tambahkan di `index.html` meta tags + di edge functions response headers:
- `Content-Security-Policy` (whitelist Supabase, Midtrans, Fonnte, Google fonts)
- `X-Frame-Options: SAMEORIGIN` (cegah clickjacking)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (batasi geolocation/camera kecuali yang dipakai)

### 1.5 Disable source maps di production
Update `vite.config.ts`: `build.sourcemap = false`. Source map saat ini bisa dipakai attacker untuk reverse engineer struktur komponen.

---

## 2. Rate Limiting (ad-hoc)

⚠️ **Disclaimer:** Lovable belum punya primitive rate-limiting matang, jadi implementasi akan ad-hoc menggunakan tabel Postgres. Bukan pengganti WAF profesional, tapi cukup untuk mencegah abuse skala kecil-menengah.

### Implementasi
Buat tabel `rate_limits`:
```text
key TEXT (mis. "login:user@x.com" atau "chat:ip:1.2.3.4")
window_start TIMESTAMPTZ
count INTEGER
```
Plus RPC `check_rate_limit(_key, _max, _window_seconds)` yang atomic.

Pasang di edge function berikut:
| Function | Limit |
|---|---|
| `chat` (AI Gateway) | 20 req / menit per user |
| `service-consultation` | 5 / menit per IP |
| `register-push-token` | 10 / jam per user |
| `admin-user-ops` (action `confirm_email_by_email`) | 5 / 10 menit per email |
| `notify-booking-status` (skip — internal trigger) | – |

Login & signup dilindungi via **CAPTCHA Turnstile** (#1.3), tidak perlu rate limit terpisah.

---

## 3. Audit Log Admin Sensitif

### Tabel baru `admin_audit_log`
```text
id, actor_id, actor_role, action, target_type, target_id,
target_label, before JSONB, after JSONB, ip TEXT,
user_agent TEXT, created_at
```
RLS: hanya `staff` (Owner) yang bisa SELECT. Tidak ada UPDATE/DELETE (immutable).

### Aksi yang dicatat (via trigger DB + edge function)
- `admin-user-ops`: `set_role`, `reset_password`, `delete_user`, `verify_user`
- Trigger DB pada `payments` UPDATE: payment_status manual change oleh staff
- Trigger DB pada `referral_withdrawals` UPDATE: approve/reject + amount
- Trigger DB pada `loyalty_points` UPDATE: manual point adjustment oleh staff
- Trigger DB pada `manual_payment_proofs` UPDATE: approve/reject

### UI panel
Tambah halaman `/dashboard/audit-log` (Owner-only):
- Filter: actor, action type, date range
- Tabel paginated dengan diff before/after dalam expandable row
- Export CSV

---

## File / Komponen yang akan diubah/dibuat

**Migrasi DB baru:**
- `rate_limits` table + RPC `check_rate_limit`
- `admin_audit_log` table + RLS + triggers
- Patch policy `booking_status_logs` (hapus `OR true`)
- Audit fixes dari Supabase linter

**Edge functions:**
- `verify-turnstile/index.ts` (baru)
- `chat`, `service-consultation`, `register-push-token`, `admin-user-ops` (tambah rate limit + audit logging)

**Frontend:**
- `src/pages/Auth.tsx` (Turnstile widget)
- `src/pages/legal/ContactComplaintForm.tsx` (Turnstile)
- `src/pages/Admin.tsx` + `src/components/admin/AdminSidebar.tsx` (menu Audit Log)
- `src/components/admin/AuditLogPanel.tsx` (baru)
- `index.html` (security headers meta)
- `vite.config.ts` (`sourcemap: false`)

**Konfigurasi:**
- `configure_auth(password_hibp_enabled: true)`
- Secret baru: `TURNSTILE_SECRET_KEY` (Anda harus daftar gratis di Cloudflare → Turnstile, dapat siteKey + secretKey)

---

## Apa yang TIDAK termasuk

- Anti-scraping/watermark (Anda skip)
- WAF / DDoS protection skala besar (di luar kapabilitas Lovable; pertimbangkan Cloudflare di domain)
- Penetration testing manual oleh pihak ketiga (rekomendasi terpisah jika omset signifikan)

---

## Estimasi
~6 file frontend + 4 edge functions + 3 migrasi. Hardening dasar & audit log butuh persetujuan migrasi DB. Untuk Turnstile saya akan minta `TURNSTILE_SECRET_KEY` setelah Anda approve plan ini.

Setuju lanjut implementasi?