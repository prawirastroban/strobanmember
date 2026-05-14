## Tujuan
Lengkapi semua klausa legal & halaman penting yang belum ada, beserta panel admin untuk mengeditnya.

## Halaman publik baru
Semua di-render dari satu komponen `LegalPage.tsx` yang membaca dokumen berdasarkan `slug` dari DB:

| Route | Slug | Isi default |
|---|---|---|
| `/legal/syarat-ketentuan` | `terms` | Syarat & Ketentuan penggunaan situs/aplikasi |
| `/legal/kebijakan-privasi` | `privacy` | Pengumpulan & perlindungan data (UU PDP) |
| `/legal/kebijakan-cookie` | `cookie` | Penggunaan cookie & analytics |
| `/legal/refund-pembatalan` | `refund` | Pembatalan booking, refund, voucher |
| `/legal/disclaimer-layanan` | `disclaimer` | Garansi servis, batas tanggung jawab |
| `/legal/faq` | `faq` | Pertanyaan umum (booking, voucher, poin, cabang) |
| `/legal/kontak-pengaduan` | `contact` | Form pengaduan + WA/email/cabang |

Komponen render: Navbar + judul + `whitespace-pre-wrap` markdown sederhana + tanggal "Terakhir diperbarui" + Footer. Mobile-friendly (max-w-3xl, prose).

## Footer
Tambah grid "Legal" & "Bantuan" dengan link ke 7 halaman di atas + © tahun + nomor badan usaha (opsional, isi via setting).

## Form pengaduan (`/legal/kontak-pengaduan`)
Form: nama, telepon/email, kategori, pesan, lampiran opsional. Submit ke tabel `complaints` baru (atau pakai `activity_logs` type `complaint` jika kompleksitas DB ingin minimal). Plan default: tabel `customer_complaints` baru dengan RLS (siapa pun boleh INSERT, hanya staff/admin yang SELECT/UPDATE; muncul di panel admin existing).

## Database
**Migration baru:**
1. `legal_documents` — `slug text PK`, `title text`, `content text`, `version int default 1`, `updated_at`, `updated_by`. RLS: SELECT public; INSERT/UPDATE staff/admin. Seed 7 baris dengan template default.
2. `customer_complaints` — `id`, `name`, `phone`, `email`, `category`, `message`, `attachment_url`, `status default 'new'`, `created_at`, `user_id nullable`. RLS: INSERT public (anon+auth); SELECT/UPDATE staff/admin; user lihat milik sendiri.

## Panel admin baru
**Route:** `/dashboard/legal` (menu sidebar baru "Legal & Dokumen", icon `FileText`, `requiredRole: "owner"`).

Komponen `LegalDocumentsManager.tsx`:
- Tabs untuk 7 slug.
- Tiap tab: input judul + `<Textarea rows=20>` konten + tombol "Simpan" + checkbox "Naikkan versi".
- Tombol "Reset ke template default".
- Tampilan versi & "Terakhir diedit oleh … pada …".

Tambahkan juga tab "Pengaduan Masuk" yang me-list `customer_complaints` dengan filter status (new/in_progress/resolved) + tombol update status + balasan via WA link.

## i18n
Tambah label di `src/i18n/id.ts` & `en.ts` untuk footer ("Legal", "Bantuan", judul masing-masing halaman).

## Routing (`src/App.tsx`)
- Tambah `<Route path="/legal/:slug" element={<LegalPage />} />`
- Tambah `<Route path="/dashboard/legal" element={<AdminRoute>…</AdminRoute>} />`

## File baru
- `supabase/migrations/<ts>_legal_and_complaints.sql`
- `src/pages/LegalPage.tsx`
- `src/pages/legal/ContactComplaint.tsx` (komponen form, di-mount oleh LegalPage saat slug=`contact`)
- `src/components/admin/LegalDocumentsManager.tsx`
- `src/components/admin/ComplaintInboxManager.tsx` (jika belum tersedia di `ComplaintsManager.tsx` existing — akan di-cek dulu)

## File diedit
- `src/components/Footer.tsx` — tambah kolom Legal & Bantuan
- `src/components/admin/AdminSidebar.tsx` — tambah item "Legal & Dokumen"
- `src/pages/Admin.tsx` — daftarkan route panel
- `src/App.tsx` — daftarkan `/legal/:slug`
- `src/i18n/id.ts`, `src/i18n/en.ts`

## Out of scope
- Tidak menambah persetujuan T&C umum saat signup (T&C referral tetap seperti sekarang). Bisa dilanjutkan setelah ini disetujui.
- Tidak men-generate PDF dari dokumen legal.
- Tidak menambah cookie banner — hanya halaman kebijakannya.