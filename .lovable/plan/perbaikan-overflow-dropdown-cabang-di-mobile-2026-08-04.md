# Perbaikan Overflow Dropdown Cabang di Mobile

Panel dropdown "Pilih Cabang" melebar melewati batas layar di mobile: teks alamat cabang panjang memaksa panel lebih lebar dari layar, dan teks nama cabang masih muncul dobel di area trigger.

## Yang akan diperbaiki

1. Lebar panel dropdown dikunci mengikuti lebar tombol trigger, dengan batas maksimum selebar layar dikurangi margin, sehingga tidak pernah keluar dari layar.
2. Nama dan alamat cabang di dalam daftar dipotong rapi (satu baris, elipsis) alih-alih memaksa panel melebar.
3. Baris item diberi ruang untuk ikon centang di kiri agar teks tidak tertimpa saat cabang terpilih.
4. Area trigger dipastikan hanya menampilkan satu blok informasi (ikon, nama, alamat) tanpa duplikasi teks Radix.
5. Pemeriksaan cepat elemen lain pada halaman booking mobile (chip jam, kartu lokasi, kode voucher) untuk memastikan tidak ada yang melebihi lebar layar.

## Detail teknis

- `src/components/booking/PickupLocationSection.tsx`: tambahkan `w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1.5rem)]` pada `SelectContent`, `min-w-0` + `truncate` pada teks item, dan pastikan `SelectValue` tersembunyi tidak merender teks.
- `src/components/ui/select.tsx` tidak diubah (komponen bersama); semua penyesuaian lewat className lokal agar tidak memengaruhi dropdown lain.
- Verifikasi lewat screenshot Playwright pada viewport 393x852 dengan dropdown terbuka, plus cek `document.scrollingElement.scrollWidth` tidak melebihi lebar viewport.

Tidak ada perubahan logika bisnis, data, atau alur booking.

- tambahkan tanda panah jika terdapat menu yang scrollable untuk memberitahukan bahwa panel tersebut bisa digeser kanan / kiri
  &nbsp;