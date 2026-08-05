# Search Bar Pintar untuk Kategori Ban di /katalog

Saat kategori **Ban** dipilih, search bar berubah jadi mode pencarian ban: format merk / ukuran / rim, dengan parsing otomatis, saran ketik, dan chip cepat. Hasil menggabungkan layanan kategori Ban + produk ban dari inventori.

## Perilaku yang dibangun

**1. Search bar adaptif**
- Kategori lain: placeholder tetap "Cari layanan..."
- Kategori Ban: placeholder "Merk / Ukuran / Rim — cth: Bridgestone 205/65 R15", ikon berubah jadi ikon ban.

**2. Parsing ukuran otomatis**
Query dipecah jadi token merk + ukuran:
- `205/65R15`, `205/65 R15`, `205 65 15`, `205/65-15` → lebar 205, profil 65, rim 15
- `r15`, `ring 15`, `15` → hanya rim
- Sisa kata (mis. `bridgestone`, `turanza`) dicocokkan ke merk/tipe.
Cocokkan longgar: jika hanya rim yang diisi, semua ukuran dengan rim itu tampil.

**3. Autocomplete**
Dropdown saran di bawah input berisi maksimal 8 entri: merk, ukuran populer, dan kombinasi "Merk + Ukuran" yang ada di data. Klik saran mengisi input.

**4. Chip filter cepat**
Baris chip di bawah search bar (hanya di kategori Ban), memakai `ScrollHintRow`:
- Chip merk populer (dari data ban aktif)
- Chip rim R13–R20 (hanya yang tersedia)
Chip bersifat toggle dan digabung dengan teks pencarian.

**5. Hasil gabungan**
- Bagian **Layanan Ban** — kartu layanan seperti sekarang (tambah ke keranjang / booking).
- Bagian **Produk Ban** — kartu ban (foto, merk, tipe, badge ukuran, kategori). Klik membuka dialog detail ban (deskripsi + kompatibilitas OEM) dengan CTA konsultasi WhatsApp, konsisten dengan katalog ban di beranda.
- Jika salah satu bagian kosong, bagian itu disembunyikan; kalau dua-duanya kosong tampil pesan "Tidak ada hasil".

## Catatan teknis

- Sumber data ban: tabel `tires` (`brand, type, size, category, description, oem_compatibility, image_url, logo_url`), difilter `is_active = true`. Dimuat lazy hanya saat kategori Ban aktif.
- Helper baru `src/lib/tireSearch.ts`: `parseTireQuery(q)` → `{ width, profile, rim, terms[] }`, `matchTire(tire, parsed)`, dan `buildSuggestions(tires, q)`. Murni fungsi, tanpa efek samping — mudah diuji.
- Komponen baru `src/components/catalog/TireSmartSearch.tsx` (input + dropdown saran + chip) dan `src/components/catalog/TireResultCard.tsx`.
- `src/pages/Katalog.tsx` hanya mengatur mode (`activeCategory === "tires"`), state query/chip, dan merender dua bagian hasil. Tidak ada perubahan skema database, RLS, atau logika keranjang/booking yang sudah ada.
- Deep-link tetap: `?category=tires` mengaktifkan mode ban; query pencarian tidak diubah ke URL.
