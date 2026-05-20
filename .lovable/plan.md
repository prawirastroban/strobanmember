## Tujuan
Tambahkan pengaturan khusus di `/dashboard/marketing/branding` untuk mengganti **ikon yang tampil di hasil pencarian Google** (seperti pada gambar yang diunggah — lingkaran kecil di sebelah `bengkelstroban.com`).

## Konteks
- Sumber ikon untuk hasil pencarian Google adalah **favicon situs**, sama dengan ikon tab browser.
- Saat ini di branding sudah ada slot "Favicon" tapi belum dijelaskan secara eksplisit bahwa slot ini juga yang dipakai Google, jadi user tidak yakin di mana harus menggantinya.

## Rencana implementasi
1. **Perbarui slot Favicon di `BrandingManager.tsx`**
   - Ganti judul jadi "Ikon Browser & Hasil Pencarian Google".
   - Deskripsi diperjelas: ikon ini muncul di tab browser, di hasil pencarian Google, dan di shortcut home screen mobile.
   - Tambahkan panduan teknis Google: minimal 48×48 px, bentuk persegi, format PNG/ICO, latar bersih atau transparan, hindari teks kecil.

2. **Tambahkan pratinjau ala Google Search**
   - Buat komponen pratinjau mini yang meniru tampilan hasil pencarian Google (lingkaran ikon + nama domain + judul + deskripsi) menggunakan favicon, brand name, site title, dan site description aktif.
   - Pratinjau ini langsung memperlihatkan bagaimana hasil pencarian akan terlihat setelah Google re-crawl.

3. **Tambahkan info status & catatan**
   - Tampilkan URL favicon aktif (yang dipakai aplikasi & manifest).
   - Catatan jelas: setelah ganti ikon, lakukan **Publish** agar aset statis Google bisa membaca ikon baru, lalu Google butuh beberapa hari sampai beberapa minggu untuk memperbarui cache.
   - Tombol/link cepat untuk mengetes URL `/favicon.ico` dan `/favicon.png` di domain published.

4. **Pertahankan integrasi sinkronisasi yang sudah ada**
   - Tetap pakai field `favicon_url` di `app_branding` dan alur `BrandingSync` yang sudah memperbarui `icon`, `shortcut icon`, dan `apple-touch-icon` runtime.
   - Tidak perlu kolom DB baru atau migrasi.

## Detail teknis
- File yang disentuh: `src/components/admin/BrandingManager.tsx` (hanya UI bagian favicon + pratinjau).
- Tidak ada perubahan database.
- Tidak ada perubahan pada `BrandingSync` (sudah memperbarui semua link icon runtime).

## Hasil yang diharapkan
- Admin punya satu tempat jelas di `/dashboard/marketing/branding` untuk mengganti ikon yang muncul di hasil pencarian Google.
- Pratinjau ala Google langsung menampilkan bagaimana ikon, judul, dan deskripsi akan terlihat.
- Catatan teknis memberi ekspektasi realistis bahwa perubahan Google butuh re-crawl beberapa hari.