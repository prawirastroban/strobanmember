## Tujuan
Saat user mengetuk tile kategori di blok **Layanan** (mobile home), langsung diarahkan ke halaman **Katalog** dengan filter kategori yang sesuai — bukan lagi membuka bottom sheet.

## Perubahan

### 1. `src/components/mobile/home/ServiceCategoryGrid.tsx`
- Ganti `onClick={() => openCategory(cat)}` pada tiap tile menjadi `navigate(\`/katalog?category=${cat.key}\`)`.
- Hapus pemakaian `Sheet` + `Dialog` preview layanan + state `activeCategory`, `selectedService`, `previewService`, `openCategory`, `closeSheet`, `handleBooking` (tidak dipakai lagi) supaya komponen tetap ramping. Floating cart-bar bawah tetap hanya muncul di sheet, jadi ikut dihapus bersama sheet.
- Tile "Lainnya" tetap navigasi ke `/katalog` (semua kategori).

### 2. `src/pages/Katalog.tsx`
- Tambahkan `useSearchParams` dari `react-router-dom`.
- Saat mount / param berubah, set `activeCategory` dari `searchParams.get("category")` jika valid (ada di daftar kategori atau `"all"`), fallback `"all"`.
- Saat user mengubah filter kategori dari UI, sinkronkan `setSearchParams({ category })` agar URL tetap shareable (tanpa scroll reset).

## Hasil
- Klik **Servis** → `/katalog?category=maintenance`
- Klik **Ban** → `/katalog?category=tires`
- Klik **Promo** → `/katalog?category=promo` (sesuai slug kategori di DB)
- Klik **Oli** → `/katalog?category=<slug oli>`
- Klik **Lihat semua** / **Lainnya** → `/katalog` (filter "Semua").