## Tujuan
Memastikan pengaturan di `/dashboard/marketing/branding` benar-benar tercermin di web dan mobile, khususnya favicon/ikon yang masih bisa terbaca sebagai ikon lama pada mobile/hasil pencarian, lalu menambahkan rekomendasi SEO yang jelas di area deskripsi situs.

## Temuan utama
- Branding saat ini sudah sinkron ke runtime app lewat `BrandingSync`, jadi favicon/title/description berubah setelah app hidup.
- Namun mobile browser, install icon, dan crawler/hasil pencarian masih banyak membaca aset statis dari `index.html`, `manifest.webmanifest`, `apple-touch-icon`, `favicon.ico`, `favicon.png`, dan ikon PWA.
- Saat ini dashboard branding belum punya mekanisme untuk menyelaraskan aset statis tersebut dengan favicon yang diunggah di branding settings.
- Data branding aktif di backend menunjukkan favicon custom sudah ada, tetapi `site_description` masih kosong.

## Rencana implementasi
1. Perkuat sinkronisasi branding global
- Rapikan `BrandingSync` agar tidak hanya mengubah favicon runtime, tetapi juga menjaga semua link icon penting di head tetap konsisten (`icon`, `shortcut icon`, `apple-touch-icon`).
- Pastikan title, application name, dan meta deskripsi ikut konsisten antara branding dashboard dan tampilan app.

2. Hubungkan branding dashboard dengan aset ikon web/mobile
- Tambahkan aksi sinkronisasi dari halaman branding agar favicon yang dipilih bisa menjadi sumber utama untuk aset yang dipakai web/mobile.
- Selaraskan penggunaan favicon statis dengan ikon yang dipakai manifest/PWA sehingga mobile tidak lagi fallback ke ikon lama.
- Hilangkan sumber konflik yang masih bisa menyebabkan browser meminta ikon lama lebih dulu.

3. Benahi pengalaman pengelolaan di `/dashboard/marketing/branding`
- Tambah status/pratinjau yang menjelaskan ikon mana yang dipakai untuk tab browser, mobile/home screen, dan hasil pencarian.
- Tambah catatan yang lebih tepat: perubahan pada hasil pencarian Google tetap bergantung pada crawl ulang, tetapi sisi web/mobile published harus mengikuti branding yang sudah disimpan.

4. Tambahkan rekomendasi SEO pada field deskripsi situs
- Tambah helper text yang memberi panduan panjang ideal, fokus kata kunci, lokasi layanan, dan manfaat utama.
- Tambah tombol/opsi rekomendasi cepat sehingga admin bisa mengisi deskripsi SEO yang lebih rapi tanpa menebak format.
- Jaga agar copy tetap sesuai brand Sahabat Stroban dan layanan bengkel multi-kota.

5. Validasi hasil
- Cek ulang semua referensi ikon di codebase agar tidak ada lagi path lama yang mengganggu.
- Verifikasi tampilan branding di preview web dan memastikan alur mobile/web memakai sumber ikon yang sama setelah publish.

## Detail teknis
- File yang kemungkinan disentuh: `src/components/BrandingSync.tsx`, `src/components/admin/BrandingManager.tsx`, `index.html`, `public/manifest.webmanifest`, dan kemungkinan referensi ikon statis terkait.
- Tidak perlu perubahan database schema.
- Fokus hanya pada frontend, aset branding, dan UX pengaturan SEO/branding.

## Hasil yang diharapkan
- Branding di dashboard menjadi sumber kebenaran untuk favicon/title/description.
- Ikon lama Lovable tidak lagi muncul karena konflik aset statis.
- Admin mendapat panduan SEO yang lebih jelas saat mengisi deskripsi situs.