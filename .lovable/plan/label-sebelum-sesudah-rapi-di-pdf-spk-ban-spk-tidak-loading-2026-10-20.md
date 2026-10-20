# Label Sebelum/Sesudah rapi di PDF SPK Ban + SPK tidak loading lagi saat dibuka kembali

## 1. Label tegak "Sebelum" / "Sesudah" (PDF SPK Ban)
Di PDF, tulisan tegak di strip hijau bergeser dan tidak di tengah. Tulisan itu akan diposisikan tepat di tengah strip, baik tegak maupun mendatar, sehingga di pratinjau dan PDF sama rapi. Strip sedikit dilebarkan agar tulisan tidak menempel ke tepi.

## 2. Halaman SPK tidak loading lama saat kembali
Sekarang setiap kali kembali ke daftar SPK atau membuka SPK yang sama lagi, semua data diambil ulang dari awal dan layar menunggu.
- Daftar SPK dan SPK yang terakhir dibuka disimpan sementara di perangkat.
- Saat kembali, data terakhir langsung tampil, lalu diperbarui diam-diam di belakang. Tanda loading hanya muncul jika belum pernah dibuka sebelumnya.

## Detail teknis
- `BanPrintSheet.tsx` `CondTable`: ganti `writingMode` + rotate dengan wadah `relative w-7` dan span absolut `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap leading-none` (html2canvas menangani transform dengan benar).
- `SPKAllList.tsx`: cache hasil `mapped` di memori modul + sessionStorage (`spk:list:v1`); inisialisasi `rows` dari cache, `loading` hanya true bila cache kosong; refetch tetap berjalan.
- `useSPKRow.ts`: cache per id di Map modul; inisialisasi `row` dari cache, jangan `setRow(null)`/loading bila cache ada; revalidasi di background.
- Verifikasi: Playwright navigasi daftar → detail → kembali, spinner tidak muncul kedua kalinya; unduh PDF SPK Ban dan cek label.
