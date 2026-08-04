# Gabungkan Searchbar "Apa masalah mobil anda?" dengan Panel Keluhan

## Kondisi sekarang
Di beranda mobile ada dua elemen terpisah dengan tujuan yang sama:

1. Searchbar "Apa masalah mobil anda ?" — hanya tombol pemicu.
2. Kartu di bawahnya yang muncul setelah ditekan: tab **Keluhan | Booking** + form keluhan AI + tombol X.

Akibatnya terlihat dua kotak bertumpuk, ada tab yang sebagian fungsinya sudah diwakili menu lain, dan tombol tutup terpisah dari pemicunya.

## Rekomendasi (yang akan diterapkan)
Jadikan keduanya **satu komponen yang mengembang (expandable search)**:

```text
[ 🔍  Apa masalah mobil anda ?            → ]   <- tertutup

setelah ditekan:

[ 🔍  Apa masalah mobil anda ?            ✕ ]
|-------------------------------------------|
|  Form keluhan AI (Konsultasi)             |
|  - deskripsi keluhan                      |
|  - data kendaraan (merk/tahun/transmisi)  |
|  - tombol kirim                           |
|-------------------------------------------|
```

Detail:
- Searchbar tetap di posisinya (di bawah banner) dan menjadi **kepala** panel. Saat aktif, sudut bawahnya menyatu dengan panel sehingga terlihat satu kartu.
- Ikon panah kanan berubah jadi ✕ saat terbuka untuk menutup. Tidak ada lagi tombol X terpisah di dalam kartu.
- **Tab "Keluhan | Booking" dihapus.** Panel langsung menampilkan form keluhan, sesuai pertanyaan pemicunya. Aksi booking tetap tersedia lewat kartu layanan (Ganti Oli / Ganti Ban / Paket Servis) dan menu bawah, jadi tidak ada fungsi yang hilang.
- Panel mengembang dengan animasi halus dan otomatis di-scroll ke tampilan agar keyboard tidak menutupi form.

## Yang tidak berubah
- Logika konsultasi/keluhan AI, pengiriman data, dan booking tetap sama.
- Banner slider, kartu layanan, voucher, "Who We Are", dan panduan booking tidak disentuh.
- Tampilan desktop tidak berubah.

## Catatan teknis
- `src/components/mobile/home/HeroBookingForm.tsx`: gabungkan blok `variant !== "form"` (searchbar) dan `variant !== "hero"` (kartu) menjadi satu render; hapus toggle `heroMode` beserta tab, sisakan `<Konsultasi embedded defaultMode="complaint" />`.
- `src/pages/Index.tsx`: cukup satu `<HeroBookingForm />`; state buka/tutup dikelola lewat prop `open`/`onToggle`, event `toggle-konsultasi` tetap didukung agar pemicu dari tempat lain tidak rusak.
- Verifikasi lewat screenshot mobile (393x852) untuk keadaan tertutup dan terbuka.