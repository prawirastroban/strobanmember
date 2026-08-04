# Perencanaan: Perbaikan Judul Kartu QR Booking

## Tujuan
Membuat judul pada `BookingQRCard` menjadi simetris dan tampilannya lebih menarik saat booking berhasil dibuat.

## Perubahan yang akan dilakukan
1. **Simetri judul**
   - Mengubah layout judul agar teks "KODE BOOKING BERHASIL DIBUAT, SILAHKAN TUNJUKAN KE KASIR" berada di tengah secara horizontal.
   - Menempatkan ikon `ScanLine` di atas teks atau di samping dengan jarak seimbang, agar tidak membuat teks terasa condong ke satu sisi.

2. **Visual yang lebih menarik**
   - Memberikan treatment badge/pill pada judul dengan background `primary/10` dan border `primary/20`.
   - Meningkatkan hierarki tipografi: ukuran teks sedikit lebih besar, tracking/lebar huruf tetap rapi, dan warna `primary` yang solid.
   - Menambahkan padding dan rounded corners agar judul terlihat seperti pita informasi, bukan sekadar baris teks.

3. **Responsif & aman di mobile**
   - Memastikan judul tidak overflow atau terpotong di layar sempit (max-width, text-wrap balance, icon shrink-0).
   - Menjaga jarak antar elemen dalam kartu tetap nyaman.

## Verifikasi
- Meninjau komponen di viewport mobile (393px) untuk memastikan judul simetris dan tidak overflow.
- Memastikan perubahan tidak mengganggu elemen lain dalam kartu (QR code, kode booking, total, instruksi).
