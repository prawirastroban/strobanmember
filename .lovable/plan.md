# Public SPK Share Link + Gated PDF Download

Tujuan: link/QR share SPK dapat diakses **tanpa login** (read-only preview). Untuk **unduh PDF** atau **share sistem**, user diarahkan mengaktifkan akun.

## Kondisi saat ini
- Route `/spk/:id/print` sudah public di `App.tsx` (bukan di dalam `ProtectedRoute`).
- Tapi `SPKPrint.tsx` memanggil `supabase.from("spk_orders" | "branches" | "spk_timeline_events").select(...)` langsung dari client. RLS pada `spk_orders` hanya mengizinkan staff/mekanik/customer terkait → **anon = data kosong**, halaman blank.
- Tombol **Unduh PDF** & **Bagikan** aktif untuk siapa pun; belum ada gating.

## Perubahan

### 1. Edge Function baru: `spk-public-view` (verify_jwt=false)
- Input: `{ id: string }` (SPK UUID).
- Pakai service role untuk membaca `spk_orders`, `branches` (by branch_id), `spk_timeline_events` (by spk_id).
- **Sanitasi output** — hanya field yang aman untuk publik:
  - SPK: nomor, tanggal, status, customer_name, vehicle_label, plate_number, form data (checklist/estimasi), signatures (base64 sudah "publik" karena dicetak), branch_id, timestamps, mechanic_name.
  - Buang kolom sensitif kalau ada (mis. internal cost breakdown / user_id / raw contact). Jika field seperti `customer_phone` ada di record, mask jadi `08•• •••• 1234`.
  - Branch: name, address, phone (publik semua).
  - Timeline: event_type, label, created_at, actor_display_name (bukan user_id).
- Rate limit via RPC `check_rate_limit` yang sudah ada (`spk-public-view:${id}`).

### 2. `SPKPrint.tsx`
- Deteksi sesi via `supabase.auth.getSession()` saat mount.
- **Auth path** (existing): tetap query langsung ke Supabase — user staff/customer terautentikasi bisa lihat semua yang RLS izinkan.
- **Anon path**: panggil edge `spk-public-view` untuk mengisi state `spk`, `branch`, `timeline`. Bila gagal (404/kena rate limit), tampilkan empty state "Link tidak valid atau sudah kedaluwarsa".
- Header untuk anon: badge kecil "Pratinjau Publik — Aktivasi akun untuk fitur lengkap".
- **Gate tombol PDF & Share**:
  - Jika anon → `downloadPdf` dan `handleShare` **tidak** menjalankan aksi asli. Sebagai gantinya buka `AlertDialog` "Aktivasi akun untuk mengunduh PDF SPK".
    - Body: penjelasan singkat + bahwa akun sudah otomatis dibuat saat servis; aktivasi kata sandi via link WhatsApp dari admin.
    - CTA primer: **Masuk / Aktivasi Akun** → `navigate('/auth?redirect=' + encodeURIComponent(location.pathname))`.
    - CTA sekunder: **Hubungi Admin (WhatsApp)** → `wa.me/628973700800` dengan pesan pre-filled berisi nomor SPK.
  - Postmessage bridge dari `SPKViewDialog` juga honor gating (jika parent minta `download`/`share` dan user anon, dialog activation muncul di dalam iframe).
- Auth path tetap: langsung download/share seperti sekarang.

### 3. `SPKShareCard.tsx`
- Tambah 1 baris keterangan kecil di bawah link: "Link ini bisa dibuka tanpa login (pratinjau). Unduh PDF butuh aktivasi akun." — supaya admin paham apa yang dilihat customer.
- Badge yang sudah ada "Bisa diakses tanpa login" tetap.

### 4. Tidak ada perubahan skema / migration
- RLS tetap ketat. Semua akses publik hanya via edge function dengan whitelist kolom.

## Catatan teknis
- File terdampak:
  - `supabase/functions/spk-public-view/index.ts` (baru).
  - `src/pages/spk/SPKPrint.tsx` (deteksi sesi, fetch conditional, gating dialog).
  - `src/components/spk/SPKShareCard.tsx` (copy kecil).
- Tidak menyentuh: `SPKViewDialog.tsx` (bridge existing tetap kompatibel), `SPKAllList.tsx`, route registry.
- Bahasa: Bahasa Indonesia default. Waktu `HH:mm`, tanggal `15 Oct 2023`.

## Ringkasan pengalaman
- Customer klik link WA → langsung lihat SPK lengkap (read-only) tanpa login.
- Klik **Unduh PDF** / **Bagikan** → popup ajakan aktivasi akun + tombol Masuk / Hubungi Admin.
- Setelah login/aktivasi, tombol berfungsi normal (path autentikasi lama).
