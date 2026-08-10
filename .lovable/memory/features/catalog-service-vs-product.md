---
name: Katalog Jasa vs Barang
description: Kategori katalog wajib berjenis Jasa atau Barang; item Barang punya promo bertingkat qty 1-4
type: feature
---
Setiap kategori di `service_categories` punya kolom `kind`: `service` (Jasa) atau `product` (Barang: ban / sparepart / oli). Default `service`; kategori `tires` = `product`.

Item di `services` berkategori Barang menyimpan promo bertingkat pada kolom `qty_discounts jsonb`: array `{ qty: 1|2|3|4, type: "percentage"|"fixed", value: number }`. Hanya tier dengan value > 0 yang disimpan. Item Jasa selalu menyimpan `[]`.

Admin: Dashboard → Marketing → Layanan. Dialog "Kelola Kategori" punya pemilih Jenis (Jasa/Barang) + badge. Panel "Promo Pembelian Bertingkat" hanya muncul di form service ketika kategori terpilih berjenis Barang.

Hook `useServiceCategories` mengekspos `kind` per kategori plus `kindFor(slug)` dan `isProduct(slug)`.
