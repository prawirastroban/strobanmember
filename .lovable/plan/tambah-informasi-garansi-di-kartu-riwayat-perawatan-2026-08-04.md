# Tambah Informasi Garansi di Kartu Riwayat Perawatan

Menampilkan info garansi layanan pada kartu booking di halaman Riwayat Perawatan, memakai data garansi yang sudah diisi admin di Manajemen Layanan (field "Informasi Garansi").

## Yang akan dibuat

- Baris kecil bergaya chip pada kartu booking: ikon perisai + teks garansi, mis. "Garansi 30 hari / 1.000 km".
- Ditampilkan hanya untuk booking berstatus Selesai (garansi baru relevan setelah servis) dan hanya jika layanan punya info garansi.
- Jika layanan tidak punya info garansi, tidak ada baris tambahan (kartu tetap seperti sekarang).
- Info garansi yang sama juga muncul di dialog detail pembayaran/booking agar konsisten.

## Detail teknis

- Tabel `bookings` tidak menyimpan `service_id`, jadi pemetaan dilakukan dengan mengambil `name` + `warranty_info` dari tabel `services` (satu query saat halaman dimuat), lalu dicocokkan ke `booking.service_name` secara case-insensitive dan trim. Nama booking gabungan (mis. "Paket A + Promo B") dipecah dengan pemisah " + " dan garansi diambil dari layanan utama yang cocok pertama.
- Perubahan hanya di `src/pages/HistoryPerawatan.tsx` (fetch tambahan + prop `warranty` untuk `BookingCard`). Tanpa perubahan skema database, RLS, atau logika bisnis.
- Gaya mengikuti chip yang sudah ada (`text-[10px]`, border tipis, warna emerald/muted sesuai token tema).
- tambahkan pengaturan garansinya di dashboard marketing services di setiap service yang dibuat, jadi ada inptu tambahan untuk memberitahukan garansi
- berikan dummy garansi di setiap service sekarang, dan tampilkan di setiap card catalog dan riwayat service yang sudah dilakukan