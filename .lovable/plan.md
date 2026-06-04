## Tujuan
Tampilkan info **Potongan** pada header row card booking (di sebelah harga), tanpa membuat tata letak menabrak.

## Perubahan
`src/components/admin/BookingsManager.tsx` (±line 1011–1015), blok harga di header row:

- Hitung `disc = Number(booking.discount_amount ?? 0)`.
- Tetap render `Rp {service_price}` sebagai harga utama (bold).
- Jika `disc > 0`:
  - Di atas harga tampilkan baris kecil coret `Rp {original_service_price ?? service_price + disc}` (`text-[10px] line-through text-muted-foreground tabular-nums leading-none`).
  - Di bawah harga tampilkan badge mini hijau: `-Rp {disc}` (`text-[10px] text-emerald-600 dark:text-emerald-400 leading-none`).
- Bungkus 3 baris itu dalam `flex flex-col items-end leading-tight` agar rapi vertikal dan rata kanan; container parent tetap `flex items-center gap-2`. Tidak ada perubahan ke kolom waktu atau tombol menu.
- Tambah `whitespace-nowrap` pada elemen harga & potongan agar tidak wrap aneh.

## Yang TIDAK diubah
- Tidak menyentuh row tengah (customer/mobil/service).
- Tidak menyentuh logika data, hanya tampilan presentasi.

## Verifikasi
- Booking tanpa diskon → tampilan harga tetap seperti sekarang (1 baris).
- Booking dengan diskon → muncul harga coret kecil di atas + `-Rp …` hijau kecil di bawah; tombol `MoreVertical` tetap sejajar tengah, tidak terpotong/menabrak.