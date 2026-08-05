# Notifikasi Gaya iPhone (iOS Notification Banner)

Mengubah tampilan pop-up notifikasi (toast) — termasuk "Belum ada pesanan aktif" — agar mirip banner notifikasi iPhone, tetap selaras dengan tema liquid glass + aksen merah neon Stroban.

## Tampilan baru

```text
+------------------------------------------------+
| [ikon app]  BENGKEL STROBAN          sekarang   |
|             Belum ada pesanan aktif             |
|             Yuk buat booking servis...          |
|                              [ Pesan Sekarang ] |
+------------------------------------------------+
```

Karakter iOS yang diambil:
- Kartu melayang lebar, sudut sangat membulat (radius ~22px), tanpa border tebal.
- Latar kaca buram (blur kuat) + bayangan lembut menyebar, bukan glow tegas.
- Ikon aplikasi kotak-rounded di kiri sebagai identitas pengirim.
- Baris atas: nama app (huruf kecil, uppercase, tipis) + waktu "sekarang" di kanan.
- Judul tebal 1 baris, deskripsi 2 baris abu-abu.
- Animasi masuk: turun dari atas dengan sedikit skala & pegas; keluar: naik memudar. Geser ke atas untuk menutup (sudah aktif).
- Tombol close bulat kecil muncul saat hover/tekan, bukan permanen mencolok.

## Yang diubah

- `src/index.css` — ganti blok gaya `[data-sonner-toast]`: radius lebih besar, border tipis 0.5px, bayangan halus ala iOS, blur lebih kuat, animasi masuk/keluar bergaya pegas. Varian success/warning/error hanya beda aksen tipis (garis warna di kiri), bukan glow berat.
- `src/components/ui/sonner.tsx` — atur ulang `toastOptions.classNames` (padding, tipografi judul/deskripsi, tombol aksi berbentuk pill), dan tambahkan header "BENGKEL STROBAN · sekarang" plus ikon aplikasi lewat wrapper toast custom sehingga semua pemanggilan `toast()` yang sudah ada tetap bekerja tanpa perubahan.
- Tidak ada perubahan logika, data, atau isi pesan; hanya presentasi.

## Catatan teknis

Header + ikon ditambahkan sebagai lapisan visual di komponen Toaster (via CSS `::before` pada judul atau custom `title` renderer), sehingga tidak perlu menyentuh puluhan pemanggilan `toast()` di seluruh aplikasi.
