# Kartu Katalog: Hilangkan Gap, Tampil Lebih Profesional

## Masalah saat ini
Thumbnail dikunci rasio (mis. 1:1) dengan `self-start`, sedangkan isi teks (judul, Desc, chip garansi, harga, durasi, tombol) sering lebih tinggi. Akibatnya muncul ruang kosong di bawah gambar dan kartu terasa tidak seimbang.

## Rekomendasi tampilan
1. **Media full-bleed, tinggi mengikuti kartu**
   Gambar menempel ke tepi kiri/atas/bawah kartu (tanpa padding di sisi kiri), lebarnya tetap (112px mobile / 128px desktop), tingginya `stretch` mengikuti tinggi konten. Rasio thumbnail (1:1, 4:3, dst) dipakai sebagai *tinggi minimum* kartu, bukan pengunci tinggi gambar — jadi tidak pernah ada celah kosong.

2. **Padding kartu dipindah ke sisi konten**
   `p-2.5` di kartu dihapus, diganti padding hanya pada blok teks (`px-3 py-2.5`). Sudut kiri gambar mengikuti radius kartu, gambar tidak lagi punya rounded terpisah — terlihat menyatu seperti kartu produk marketplace.

3. **Hierarki teks lebih rapi**
   - Baris 1: badge (jika ada) + judul 2 baris.
   - Baris 2: chip garansi/kriteria kendaraan, dibatasi maksimum 1 baris agar tinggi kartu konsisten.
   - Baris 3 (menempel bawah): harga besar + durasi kecil di kiri, tombol keranjang di kanan.
   - Tautan **Desc ›** dipindah sejajar dengan durasi (baris bawah) agar tidak menambah tinggi ekstra dan tetap mudah dijangkau ibu jari.

4. **Tinggi kartu seragam**
   Semua kartu memakai tinggi minimum sama (mis. 116px mobile) sehingga grid rata dan tidak "bergerigi" saat sebagian layanan tidak punya garansi/deskripsi.

5. **Sentuhan estetika tetap dijaga**
   Shadow lembut + glow primary saat hover dipertahankan, ditambah gradasi tipis di tepi kanan gambar agar transisi gambar→teks halus, dan overlay badge (mis. "PROMO") ditaruh di pojok atas gambar bukan di atas judul — lebih premium dan hemat ruang.

## Catatan teknis
- File yang diubah: `src/pages/Katalog.tsx` (blok `<article>` kartu layanan, baris ~366-494).
- `aspectRatio` pada wrapper media diganti `minHeight` yang dihitung dari `ratioToNumber(s.thumbnail_ratio)` × lebar kolom media; wrapper memakai `self-stretch` + `absolute inset-0` untuk `ServiceThumbnail`/`ServiceMediaSlideshow`.
- Tidak ada perubahan data, query, atau setting thumbnail di admin — murni layout/presentasi.
