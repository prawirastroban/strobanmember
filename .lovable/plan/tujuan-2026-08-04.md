Sederhanakan panel layanan di halaman booking

## Tujuan
Mengurangi kebingungan user saat sudah memilih layanan. Jika layanan sudah terpilih, hanya tampilkan layanan terpilih dalam bentuk kartu minimalis; sembunyikan katalog penuh dan hapus dialog rekomendasi layanan tambahan (akan ditambahkan kembali di kemudian hari).

## Perubahan

1. **Panel layanan hanya menampilkan yang terpilih**
   - Di `src/pages/Booking.tsx`, saat `selectedServiceIds.length > 0` panel kiri hanya merender kartu layanan yang sudah dipilih.
   - Kartu terpilih dibuat minimalis: nama, durasi, harga, dan tombol hapus (icon ×).
   - Katalog penuh dengan filter kategori dan search disembunyikan saat sudah ada layanan terpilih.

2. **Tombol untuk membuka kembali katalog penuh**
   - Di bawah kartu layanan terpilih ditambahkan tombol ringkas "Ganti / Tambah Layanan".
   - Saat tombol ditekan, katalog penuh muncul kembali dalam mode expanded; tombol tersebut berubah menjadi "Tampilkan yang dipilih saja".

3. **Hapus dialog rekomendasi/upsell**
   - Hapus state `showUpsell`, `upsellShownRef`, dan `upsellSuggestions`.
   - Hapus `Dialog` upsell beserta efek `useEffect` yang memunculkannya setelah semua bagian booking terisi.

4. **Penanganan kosong tetap sama**
   - Jika belum ada layanan terpilih, tampilkan katalog penuh seperti sekarang agar user tetap bisa memilih.

## Yang tidak berubah

- Logika pemilihan, penghitungan total, jadwal, kendaraan, cabang, voucher, cashback, dan submit booking.
- Data layanan tetap berasal dari `useBookingServices` dan Supabase.
- Tampilan katalog penuh (`Katalog.tsx`) tidak ikut diubah.

## Verifikasi

- Screenshot mobile 393x852 pada `/booking?service=<id>` menunjukkan hanya 1 kartu layanan terpilih, tanpa katalog panjang, tanpa popup upsell.
- Screenshot saat belum ada layanan terpilih menunjukkan katalog penuh tetap normal.
