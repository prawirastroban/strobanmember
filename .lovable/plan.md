## Tujuan

Mengganti hero statis di beranda mobile dengan **banner slider auto-slide (default 5 slide)** yang isinya bisa dikelola sendiri lewat **Dashboard → Marketing → Banner Beranda**.

## Yang dibangun

### 1. Penyimpanan banner (backend)
- Tabel baru `home_banners`: `id`, `image_url`, `title`, `subtitle`, `show_text` (boolean), `link_url`, `sort_order`, `is_active`, timestamps.
  - Publik boleh baca banner aktif; hanya admin/owner yang boleh tulis (dengan GRANT sesuai kebijakan).
- Pengaturan global disimpan di `app_settings` key `home.banner_settings`: `autoplay` (on/off), `interval_ms` (mis. 4000), `max_slides` (default 5).
- Bucket storage publik baru `home-banners` untuk gambar yang diupload admin.

### 2. Panel admin: Dashboard → Marketing → Banner Beranda
Route baru `/dashboard/marketing/banners`, ditambahkan ke menu sidebar Marketing (sejajar Promo, Pop-up, Branding).

Fitur panel:
- Daftar slide dengan preview gambar, drag/naik-turun untuk urutan, toggle aktif/nonaktif, hapus.
- Tambah slide: upload gambar (format bebas: JPG/PNG/WebP/AVIF, kompresi otomatis), isi judul & subjudul, link tujuan opsional.
- **Toggle "Tampilkan teks pada slide"** per slide — kalau mati, slide tampil gambar saja tanpa overlay judul/subjudul.
- Pengaturan global: jumlah slide maksimum yang tampil (default 5), autoplay on/off, dan durasi antar slide.
- Tombol simpan + notifikasi berhasil.

### 3. Hero slider di beranda
- `HeroBookingForm.tsx` bagian hero (baris ~262-304) diganti komponen baru `HomeBannerSlider`:
  - Auto-slide sesuai interval pengaturan, jeda saat disentuh/di-swipe, swipe manual, dot indicator.
  - Overlay gradient tetap dipakai agar teks terbaca; teks per slide hanya muncul jika `show_text` aktif.
  - Slide yang punya `link_url` bisa diklik.
  - Tinggi banner responsif (mobile 320px–768px) tanpa layout shift; gambar `object-cover`, slide pertama `fetchPriority=high`.
  - Fallback: jika belum ada banner di database, tampilkan hero lama (gambar `hero-bengkel.jpg` + teks "Halo kak, Mau servis apa?") supaya beranda tidak pernah kosong.
- Kartu form Keluhan/Booking di bawahnya tidak berubah sama sekali.

## Catatan teknis
- Tidak ada perubahan pada alur booking, keluhan, SPK, atau data lain.
- Query banner memakai cache ringan agar beranda tetap cepat; hanya banner `is_active` yang diambil, dibatasi `max_slides`.
