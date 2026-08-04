# Redesign Section "Kenapa pilih Stroban?"

Mengubah tampilan section Who We Are di beranda mobile agar sama dengan mockup yang diunggah.

## Tampilan baru

```text
+------------------------------------------+
|   [foto mekanik, overlay gelap]          |
|      Kenapa pilih Stroban ?              |   <- judul putih besar, tengah
+------------------------------------------+
|  +----------------+  +----------------+  |
|  | Harga          |  | Garansi Servis |  |   <- judul merah tebal
|  | Transparan     |  | & Spareparts   |  |
|  | teks abu ...   |  | teks abu ...   |  |
|  +----------------+  +----------------+  |
|  +----------------+  +----------------+  |
|  | Booking Bebas  |  | Selalu Ada     |  |
|  | Antri          |  | Promo          |  |
|  +----------------+  +----------------+  |
+------------------------------------------+
```

1. **Banner foto** di bagian atas: foto bengkel/mekanik dengan overlay gelap dan judul putih tebal "Kenapa pilih Stroban ?" di tengah. Memakai aset yang sudah ada (`hero-bengkel.jpg`).
2. **Label "Who We Are" dan paragraf deskripsi dihapus** — mockup hanya menampilkan judul di atas banner.
3. **Grid 2 kolom kartu putih** (tetap 2 kolom di layar HP, sesuai mockup) tanpa ikon: judul merah tebal + deskripsi abu-abu, sudut membulat, border tipis dan bayangan halus.
4. **Isi kartu diganti** sesuai mockup:
   - Harga Transparan — "Kami memastikan harga yang kami berikan adalah harga asli, tanpa ada biaya tersembunyi."
   - Garansi Servis & Spareparts — "Kami memastikan setiap servis mendapatkan garansi dan pergantian produk baru."
   - Booking Bebas Antri — "Kami memastikan pengerjaan servis dilakukan dengan cepat, tepat, dan presisi."
   - Selalu Ada Promo — "Kami memastikan selalu memberikan harga terbaik untuk konsumen kami."

## Catatan teknis

- File yang diubah hanya `src/components/mobile/home/TrustStrip.tsx`.
- Warna memakai token semantik yang ada (`primary`, `card`, `muted-foreground`) — tidak ada warna hardcoded.
- Banner memakai `aspect-ratio` agar tinggi konsisten, gambar `loading="lazy"`, dan teks judul tetap `h2` untuk SEO/aksesibilitas.
- Ikon lucide tidak dipakai lagi di section ini.
