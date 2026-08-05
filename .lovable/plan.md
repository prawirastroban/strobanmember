# Popup Keranjang Servis sebelum Booking

Alur baru: **pilih layanan → popup Keranjang Servis → lanjut ke Booking**.

## Kapan popup muncul
- User menekan ikon keranjang di navbar (sekarang langsung lompat ke `/booking?cart=1`).
- User menekan pill "Pesanan" mengambang di bawah.
- User menambahkan layanan baru dari Katalog / kartu layanan → popup langsung terbuka sebagai konfirmasi.

## Isi popup (sesuai mockup)
- Header: ikon keranjang merah + judul "Keranjang Servis" + tombol tutup bulat di kanan.
- Daftar item: nama layanan, harga merah tebal, dan pengatur jumlah `−  1  +` di kanan (tombol `+` merah, `−` abu-abu).
- Menekan `−` saat jumlah 1 akan menghapus item dari keranjang (dengan opsi "Urungkan").
- Baris "Total Pembayaran" dengan nominal merah besar.
- Tombol merah lebar "Lanjut ke Pembayaran →" → membuka `/booking?cart=1` (pilih cabang & jadwal, lalu pembayaran).
- Keadaan kosong: pesan singkat + tombol "Lihat Katalog".

## Kuantitas
Keranjang sekarang hanya menyimpan satu baris per layanan tanpa jumlah. Akan ditambahkan jumlah (`qty`) sehingga:
- Total harga dan total durasi dihitung dari harga/durasi × jumlah.
- Halaman Booking, ringkasan layanan terpilih, dan pembuatan pesanan mengikuti jumlah tersebut.
- Data keranjang lama di perangkat pengguna tetap terbaca (jumlah dianggap 1).

## Produk (barang) vs layanan
Saat ini keranjang hanya berisi layanan; katalog ban belum memakai keranjang ini. Agar siap:
- Setiap item keranjang diberi jenis `layanan` atau `produk`.
- Popup mengelompokkan "Layanan" dan "Produk" bila keduanya ada; produk boleh berjumlah banyak, layanan tetap boleh diatur jumlahnya.
- Tombol lanjut tetap ke halaman Booking, karena produk (mis. ban) butuh jadwal pemasangan. Jika nanti Anda ingin produk bisa dibeli tanpa jadwal, itu dikerjakan sebagai langkah terpisah.

## Catatan teknis
- Komponen baru `src/components/cart/CartSheetDialog.tsx` (Dialog shadcn, gaya glass + aksen `primary`, tanpa warna hardcoded), dipasang global lewat context kecil `CartDialogContext` agar bisa dibuka dari mana saja.
- `src/contexts/CartContext.tsx`: tambah `qty`, `kind`, fungsi `increment`/`decrement`/`setQty`, migrasi data localStorage lama.
- `src/components/Navbar.tsx` & `src/components/FloatingCartPill.tsx`: klik membuka popup, bukan navigasi langsung.
- `src/pages/Katalog.tsx` dan kartu layanan lain: setelah `addItem`, buka popup.
- `src/pages/Booking.tsx`: baca `qty` untuk ringkasan, total harga, dan durasi.
- Verifikasi dengan screenshot mobile 393x852 dan build.
