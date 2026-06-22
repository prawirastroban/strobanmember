# Perbaikan Navigasi Kategori Hero ke Katalog

## Tujuan
Memastikan setiap tile kategori di hero mobile (Servis, Ban, Oli, Promo) mengarahkan pengguna ke `/katalog?category=<slug>` dengan filter kategori langsung aktif, dan membersihkan tampilan grid agar hanya menampilkan 4 kategori yang diminta.

## Perubahan yang Akan Dilakukan

### 1. `src/components/mobile/home/ServiceCategoryGrid.tsx`
- **Batasi tile hanya 4 kategori utama**: ubah `.slice(0, 7)` menjadi `.slice(0, 4)`.
- **Hapus tombol "Lainnya"**: hilangkan blok `hasMore` agar tidak ada tile ke-5.
- **Verifikasi navigasi tile**: fungsi `openCategory` sudah mengarahkan ke `/katalog?category=<slug>`, tetap dipertahankan. Tidak ada perubahan logika navigasi di sini selain memastikan keempat slug (`maintenance`, `tires`, `paket-ganti-oli`, `promo-spesial`) digunakan.

### 2. `src/pages/Katalog.tsx`
- **Tambahkan label Indonesia untuk semua slug kategori** di `CATEGORY_LABELS`, termasuk:
  - `maintenance` → "Servis"
  - `tires` → "Ban"
  - `paket-ganti-oli` → "Oli"
  - `promo-spesial` → "Promo"
  - slug lain yang ada di DB (`electrical`, `ac`, `body`, `engine`, `detailing`, `tune-up`, `spooring`, `pengecekan`, `ban-luar`) juga diberi label rapi agar chip filter tidak menampilkan teks dengan tanda hubung.
- **Perkuat sinkronisasi URL → filter**: pastikan `useEffect` pembacaan `?category=` menangani semua slug aktif, menghindari race condition saat data layanan masih loading, dan selalu mengembalikan ke `"all"` jika slug tidak dikenali.

## Hasil Akhir yang Diharapkan
- Hero mobile menampilkan 4 tile: **Servis → Ban → Oli → Promo**.
- Klik tile mana pun langsung membuka `/katalog?category=<slug>`.
- Halaman Katalog langsung menampilkan hasil yang difilter sesuai kategori yang diklik.
- Label filter Katalog konsisten dengan label tile hero.

## Verifikasi
- Jalankan build/compile untuk memastikan tidak ada error TypeScript.
- Uji dengan Playwright: klik masing-masing 4 tile hero dan verifikasi URL serta filter aktif di halaman Katalog.