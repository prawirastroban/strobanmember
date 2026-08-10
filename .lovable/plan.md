# Pisahkan Katalog: Jasa vs Barang + Promo Bertingkat

## Tujuan
1. Setiap kategori layanan ditandai sebagai **Jasa (service)** atau **Barang (product)**.
2. Jika item termasuk **Barang** (ban / sparepart / oli), form katalog menampilkan **Promo Bertingkat**: potongan untuk pembelian 1, 2, 3, dan 4 unit.
3. Perbaiki tampilan kolom **Icon** di dialog Edit Service yang teksnya meluber melewati batas.

## Perubahan Data
- Tambah kolom `kind` pada tabel kategori layanan: nilai `service` (default) atau `product`.
- Tambah kolom promo bertingkat pada tabel layanan: daftar aturan `{ qty, tipe potongan (persen/rupiah), nilai }` untuk qty 1–4.
- Kategori "Ban" ditandai sebagai barang saat migrasi; kategori lain tetap jasa.

## Perubahan Admin (Dashboard → Marketing → Layanan)
- Dialog **Kelola Kategori**: tambah pilihan Jenis (Jasa / Barang) per kategori, dan badge penanda di daftar kategori.
- Dialog **Tambah/Edit Service**:
  - Saat kategori terpilih berjenis Barang → muncul panel **Promo Pembelian Bertingkat** dengan 4 baris (1 pcs, 2 pcs, 3 pcs, 4 pcs), masing-masing: tipe potongan (Persen / Rupiah) + nilai. Kosong = tidak ada promo untuk qty itu.
  - Saat kategori berjenis Jasa → panel promo disembunyikan; field durasi tetap tampil. Untuk Barang, label "Duration" diberi keterangan opsional (waktu pemasangan).

## Perbaikan UI Icon
- Trigger dropdown Icon saat ini menampilkan string penuh (mis. `image:https://.../file.png`) sehingga meluber.
- Ganti tampilan trigger menjadi ikon + **nama ikon** (label) saja, dengan `min-w-0` + `truncate` agar tidak melewati batas kolom grid.

## Aturan yang Disimpan (Rules)
Simpan sebagai memori proyek: kategori katalog wajib punya jenis Jasa/Barang; item Barang mendukung promo bertingkat qty 1–4; item Jasa tidak.

## Catatan Teknis
- Migrasi: `ALTER TABLE public.service_categories ADD COLUMN kind text NOT NULL DEFAULT 'service'`, `ALTER TABLE public.services ADD COLUMN qty_discounts jsonb DEFAULT '[]'::jsonb`, update kategori `tires` → `product`.
- `useServiceCategories.ts`: sertakan `kind` pada opsi + fallback list, expose `kindFor(slug)`.
- `ServiceManager.tsx`: state form `qty_discounts`, panel kondisional, perbaikan `SelectTrigger` icon.
- Perhitungan harga di sisi customer (keranjang/checkout) **tidak** diubah pada langkah ini — hanya penyimpanan & UI admin. Beri tahu jika ingin promo ini langsung aktif di keranjang.
