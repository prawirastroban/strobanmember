## Tujuan
Tabel `home_banners` saat ini kosong (0 baris), jadi beranda masih memakai tampilan hero fallback. Tambahkan 5 banner dummy agar slider auto-slide langsung terlihat dan bisa diuji.

## Yang akan dibuat
5 gambar banner (rasio lebar, tema bengkel mobil Stroban — merah/gelap, glassy) disimpan di `src/assets/banners/` lalu di-upload ke bucket storage `branding` pada prefix `home-banners/` supaya URL-nya publik dan sama seperti hasil upload dari panel admin.

Konten slide:
1. "Servis Mobil Cepat & Terpercaya" — "Booking online, antre lebih singkat" (teks tampil)
2. "Promo Ganti Oli" — "Hemat sampai 20% bulan ini" (teks tampil)
3. "Ban Baru, Perjalanan Aman" — "Ratusan pilihan ban ready stock" (teks tampil)
4. "Cek Kesehatan Mobil Gratis" — "Laporan digital SPK langsung ke HP" (teks tampil)
5. Banner visual saja — tanpa teks (`show_text = false`) untuk mendemokan toggle teks

Semua `is_active = true`, `sort_order` 1–5, `link_url` diarahkan ke halaman terkait (booking / promo / ban) untuk slide yang relevan.

## Langkah teknis
1. Generate 5 gambar banner via image generation (1920×1080 → dipakai sebagai cover).
2. Upload tiap gambar ke bucket `branding` path `home-banners/dummy-1..5.jpg`, ambil public URL.
3. Insert 5 baris ke `public.home_banners` dengan URL publik tersebut.
4. Pastikan `app_settings` key `home.banner_settings` ada (autoplay true, interval 4000ms, max 5); set jika belum ada.
5. Cek beranda mobile lewat screenshot untuk memastikan slider berjalan.

Tidak ada perubahan logika komponen — hanya data + aset. Banner dummy bisa dihapus/diganti kapan saja lewat **Dashboard → Marketing → Banner Beranda**.
