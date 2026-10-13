# Keterangan kendaraan sejajar nama barang

## Perubahan
- Pindahkan keterangan vehicle model yang saat ini berada di baris tersendiri ke sebelah kanan ukuran/nama barang, dalam baris yang sama.
- Pertahankan nama barang di kiri dan harga rata tengah pada kolomnya; bingkai tabel, pencarian, filter, dan impor tidak berubah.
- Keterangan kendaraan tetap satu baris. Jika tidak muat, potong dengan tanda `…` dan tampilkan tombol ikon kecil untuk membuka keterangan lengkap dalam pop-up.
- Tombol detail **hanya muncul ketika keterangan kendaraan benar-benar terpotong**; tidak muncul jika teks lengkap terlihat atau data kendaraan kosong.
- Hilangkan ruang baris keterangan lama jika tidak berisi kode/satuan, agar baris barang lebih tipis. Kode dan satuan yang tersedia tetap ditampilkan.

## Detail teknis
- Gunakan area fleksibel dengan batas lebar agar nama dan keterangan kendaraan berbagi ruang tanpa menggeser kolom harga.
- Deteksi pemotongan melalui perbandingan lebar isi dan lebar tampil, diperbarui saat ukuran area berubah, kategori berganti, atau hasil pencarian berubah.
- Gunakan kontrol dan pop-up dari komponen tampilan yang tersedia, mendukung klik, sentuh, dan keyboard. Pop-up memuat nama/ukuran barang serta seluruh keterangan kendaraan tanpa pemotongan.
- Perubahan hanya pada tampilan; data kendaraan, harga, hak akses, pencarian, serta proses impor tidak diubah.

## Pemeriksaan
- Uji keterangan pendek, panjang, dan kosong: tombol hanya muncul pada keterangan yang terpotong.
- Pastikan pop-up menampilkan informasi lengkap dan dapat ditutup tanpa mengubah baris atau harga.
- Periksa Ban, Oli, Spareparts, dan Jasa pada layar lebar serta HP: tidak ada teks bertumpuk, harga bergeser, atau halaman melebar keluar layar.