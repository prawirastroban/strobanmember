# Rapikan Gambar & Deskripsi Kartu Katalog

## Masalah pada kartu
Dari screenshot kartu "Paket Servis Bronze":
- Kotak gambar (1:1) lebih pendek dari blok teks, sehingga sisi kiri kosong di bawah gambar dan kartu terlihat tidak seimbang.
- Deskripsi berisi daftar bernomor ("Isi Paket : 1. ... 2. ...") yang tersambung jadi satu paragraf panjang lalu terpotong di tengah kalimat.
- Jarak antara judul, chip garansi, harga, dan durasi tidak konsisten sehingga teks terasa berdesakan.

## Perbaikan
1. **Gambar** — kotak thumbnail tetap mengikuti rasio setelan, tapi lebarnya diseragamkan dan diselaraskan rapi di kiri atas, sehingga deretan kartu terlihat lurus.
2. **Deskripsi** — daftar bernomor dirapikan: "Isi Paket :" jadi label, item dipecah per baris pendek, maksimal 2 baris di kartu dengan elipsis rapi (bukan terputus di tengah kata). Teks lengkap tetap tampil di bottom sheet detail.
3. **Spasi** — jarak antar elemen (badge, judul, deskripsi, chip garansi, harga, durasi) diseragamkan agar tinggi kartu antar item lebih konsisten.
4. Kartu tanpa thumbnail khusus tetap memakai perilaku lama (slideshow memenuhi tinggi kartu).

## Catatan teknis
- Perubahan hanya di `src/pages/Katalog.tsx` (blok media + body kartu), memakai token semantik yang ada.
- Helper kecil untuk memformat deskripsi berdaftar (memecah pola "1. ", "2. ") dipakai khusus tampilan kartu; data di database tidak diubah.
- Verifikasi lewat screenshot mobile 393x852.