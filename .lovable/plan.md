## Form Feedback Publik (Bug / Revisi / Masukan)

Tujuan: user **dengan akun maupun tanpa akun** bisa mengirim laporan bug, revisi, atau masukan secara instan; semua masuk ke satu inbox `/dashboard/feedback` yang sudah ada, dengan filter bar diperluas agar staff bisa pilah berdasarkan sumber laporan.

### A. Halaman publik baru — `/feedback`

- Halaman netral (tanpa AdminLayout / AdminSidebar) yang bisa dibuka **siapa saja**, termasuk guest.
- Form berisi:
  - Kategori (Bug / Revisi / Masukan) — dengan ikon
  - Judul (wajib, 5–120 karakter)
  - Deskripsi (wajib, 10–2000 karakter)
  - Upload gambar/screenshot (opsional, max 5 MB → bucket `internal-reports`)
  - Field nama & email/WA — **auto-isi dari profile** kalau user sudah login dan **disabled**; **wajib diisi** kalau guest
  - `page_url` & `user_agent` ditangkap otomatis (membantu staff debugging)
- Setelah submit: tampilan terima kasih + tombol "Kirim laporan lain" / "Kembali ke beranda".
- Card di atas form berisi singkat: "Kami baca semua masukan. Untuk kasus mendesak, hubungi WhatsApp +62 897-3700-800."

### B. Akses & link masuk ke form

- **Sidebar Admin** (`AdminSidebar.tsx`): item "Bug & Masukan" sudah ada → tetap dipertahankan untuk role internal.
- **User customer** (tidak punya sidebar): tambah entry **"Beri Masukan / Lapor Bug"** di:
  - Dropdown profil (header & bottom-nav profile menu)
  - Footer website (semua halaman publik)
  - Card kecil di Customer Dashboard (di bawah area utama)
- **Guest** (belum login): link di Footer + tombol di halaman 404 ("Lapor masalah halaman ini").

### C. Backend & keamanan

1. **Migrasi `internal_reports`** — tambah kolom (tidak merusak data lama):
   - `source text NOT NULL DEFAULT 'internal'` → nilai: `internal | customer | guest`
   - `reporter_email text`, `reporter_phone text`, `user_agent text`
   - `reporter_id` jadi **nullable** (untuk guest)
2. **RLS dirombak ringan**:
   - SELECT: tetap hanya `is_internal_user` (staff/admin/admin_cabang)
   - INSERT: izinkan **any authenticated user** untuk row miliknya (`reporter_id = auth.uid()`); **guest insert via edge function** memakai service role (RLS di-bypass)
   - Customer **tidak punya akses melihat list** — by design, ini inbox internal saja
3. **Edge function `submit-public-feedback`** (verify_jwt = false):
   - Validasi Zod ketat (panjang field, format email/phone, mime upload)
   - Rate limit per IP via tabel `feedback_rate_limits` sederhana (max 5/jam)
   - Insert ke `internal_reports` dengan `source = 'guest'` atau `'customer'`
   - Upload file (kalau ada) ke bucket `internal-reports`
4. **Storage policy `internal-reports`** ditambah: izinkan upload via service role (sudah otomatis), tetap blok upload langsung dari klien anonim.

### D. `/dashboard/feedback` — perluasan filter bar

Tambah 1 dropdown lagi pada filter bar yang sudah ada:

- **Sumber**: Semua / Internal Staff / Customer Login / Guest

Plus chip kecil di tiap `ReportCard` yang menampilkan badge sumber + email/HP pelapor (kalau ada). Sisanya (kategori, status, search) **tidak diubah**.

### E. File yang akan disentuh

```text
NEW  src/pages/Feedback.tsx                 // halaman publik
NEW  src/components/feedback/PublicFeedbackForm.tsx
NEW  supabase/functions/submit-public-feedback/index.ts
NEW  supabase/migrations/<ts>_extend_internal_reports.sql
EDIT src/App.tsx                            // route /feedback (di luar AdminGuard)
EDIT src/components/Footer.tsx              // link "Beri Masukan"
EDIT src/components/Header.tsx + BottomNav  // entry profil
EDIT src/pages/NotFound.tsx                 // tombol lapor
EDIT src/components/admin/internal/InternalReports.tsx  // filter "Sumber" + kolom source
EDIT src/components/admin/internal/ReportCard.tsx       // badge source + kontak
EDIT src/components/admin/internal/ReportFormDialog.tsx // set source='internal'
```

### Catatan

- Customer **tidak diberi akses melihat daftar laporan** karena inbox bisa berisi data sensitif user lain. Mereka hanya kirim. Kalau Anda ingin customer bisa melihat **status laporan miliknya sendiri** (mis. "sudah diperbaiki"), sebutkan — itu butuh policy SELECT tambahan.
- Untuk anti-spam guest, rate-limit 5 submission/jam/IP. Bisa dinaikkan/turunkan kalau perlu.
