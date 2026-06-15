## Pop-up Promo Sistem dengan Pengaturan Dashboard

Menambahkan pop-up promo yang muncul saat user membuka website (homepage), dengan layout hybrid (gambar besar di atas + glass card berisi judul/deskripsi/CTA di bawah), countdown timer opsional, multiple kampanye aktif bersamaan, tracking impresi & klik, dan panel admin lengkap untuk mengelolanya.

### Yang akan dibangun

**1. Database (migration baru)**
Tabel `promo_popups`:
- `id`, `title`, `description`, `image_url`
- `cta_label`, `cta_url`, `cta_secondary_label`, `cta_secondary_url` (opsional)
- `audience` enum: `all` | `guest` | `authenticated`
- `frequency` enum: `every_visit` | `once_per_session` | `daily` | `weekly` | `once_ever`
- `starts_at`, `ends_at` (nullable, untuk countdown & schedule)
- `show_countdown` boolean
- `priority` int (urutan tampil saat multiple aktif)
- `is_active` boolean, `created_at`, `updated_at`
- `display_pages` text[] (default `['/']`, bisa diperluas ke route lain)

Tabel `promo_popup_events` untuk tracking analytics:
- `id`, `popup_id`, `user_id` (nullable), `session_id`, `event_type` (`impression` | `cta_click` | `dismiss`), `created_at`

Bucket storage baru `popup-images` (public read, admin write) untuk upload gambar pop-up.

RLS:
- `promo_popups`: SELECT untuk anon+authenticated (filter `is_active` & jendela aktif via query), INSERT/UPDATE/DELETE admin only.
- `promo_popup_events`: INSERT untuk semua (anon+authenticated), SELECT admin only.

**2. Komponen Frontend**

`src/components/PromoPopupManager.tsx`:
- Dipasang di `src/pages/Index.tsx` (homepage).
- Fetch pop-up aktif yang relevan untuk audience saat ini (guest/auth), filter berdasarkan `starts_at`/`ends_at`, urutkan by `priority`.
- Cek frekuensi via `localStorage` key `popup_seen_<id>` dengan timestamp; skip jika belum waktunya tampil lagi.
- Tampilkan pop-up paling prioritas pertama (jika user dismiss yang pertama, antrian berikutnya bisa di-skip untuk hari itu — keep simple: hanya 1 per kunjungan).
- Log event `impression` saat tampil, `cta_click` saat tombol diklik, `dismiss` saat ditutup.

`src/components/PromoPopupDialog.tsx`:
- Layout hybrid: gambar di area atas (aspect 16:10) + glass card (`bg-card/80 backdrop-blur-2xl border border-white/15`) di bawah berisi judul, deskripsi, countdown (bila `show_countdown && ends_at`), tombol CTA red-yellow gradient.
- Liquid glass + red neon glow konsisten dengan brand.
- Mobile-friendly (bottom sheet di mobile via `Drawer`, dialog di desktop) atau dialog responsive — pakai `Dialog` saja dengan max-w-md untuk simplicity dan konsistensi dengan `UpdatePopup`.

**3. Panel Admin**

`src/components/admin/marketing/PromoPopupManager.tsx`:
- List semua kampanye pop-up dalam tabel (judul, audience, frekuensi, jendela aktif, status, impresi, klik, CTR).
- Tombol "Buat Pop-up Baru" → membuka dialog form lengkap (upload gambar ke `popup-images` bucket, semua field di atas).
- Edit/duplikat/hapus per row, toggle aktif/non-aktif inline.
- Preview pop-up sebelum disimpan.
- Tab analytics: total impresi, klik, CTR per kampanye (query agregat `promo_popup_events`).

Daftarkan menu di `src/config/dashboardMenu.ts` di bawah grup Marketing: "Pop-up Promo" (admin only).
Route baru `/dashboard/marketing/popups` di `src/App.tsx` dan `pageRegistry`.

**4. Tracking**
- Setiap event juga dicatat di `activity_logs` (`popup_impression`, `popup_cta_click`) untuk konsistensi dengan sistem activity logging yang sudah ada.

### Detail teknis

**Frequency logic (client-side via localStorage):**
```
once_per_session  → cek sessionStorage
daily             → cek timestamp > 24h
weekly            → cek timestamp > 7d
once_ever         → localStorage permanen
every_visit       → selalu tampil
```

**Audience filter:**
```
all            → semua
guest          → !user
authenticated  → !!user
```

**Countdown:** komponen kecil yang hitung mundur ke `ends_at` (format `HH:mm:ss` atau `Dd HH:mm` jika > 24 jam), update tiap detik. Kalau sudah lewat, pop-up otomatis tidak tampil.

**Storage bucket migration:**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('popup-images', 'popup-images', true);
-- policies: public SELECT, admin INSERT/UPDATE/DELETE
```

### Files baru/diubah

Baru:
- `supabase/migrations/<timestamp>_promo_popups.sql`
- `src/components/PromoPopupManager.tsx`
- `src/components/PromoPopupDialog.tsx`
- `src/components/admin/marketing/PromoPopupAdmin.tsx`
- `src/components/admin/marketing/PromoPopupForm.tsx`
- `src/hooks/usePromoPopups.ts`

Diubah:
- `src/pages/Index.tsx` — pasang `<PromoPopupManager />`
- `src/App.tsx` — route baru `/dashboard/marketing/popups`
- `src/config/dashboardMenu.ts` — menu admin baru
- `src/config/pageRegistry.ts`
- `src/integrations/supabase/types.ts` — regenerasi otomatis setelah migration

### Out of scope (bisa ditambahkan nanti)
- A/B testing antar pop-up
- Targeting per branch / per role granular
- Push pop-up ke halaman selain homepage (sudah disiapkan kolom `display_pages` tapi UI awal hanya homepage)
