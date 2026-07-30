## Temuan

Dari tangkapan layar: pada halaman **Marketing → Banner Beranda**, tiap baris banner rusak — gambar preview memakan hampir seluruh lebar, sementara kolom form (Judul, Subjudul, Link tujuan, toggle "Tampilkan teks"/"Aktif") terdorong ke tepi kanan sampai teks label pecah satu huruf per baris dan input tidak terlihat. Bar "Simpan Perubahan" yang menempel di bawah juga menutupi teks konten.

Penyebab di `src/components/admin/HomeBannerManager.tsx` (baris ~257–349):

- Wadah gambar memakai `aspect-[16/9] w-full shrink-0 sm:w-48`. Kombinasi `w-full` + `shrink-0` membuat gambar mengklaim 100% lebar baris dan **dilarang mengecil**, sehingga kolom form tersisa nyaris 0 px begitu variasi `sm:` tidak berlaku (mis. panel preview sempit / breakpoint tidak aktif). Inilah persis gejala pada gambar.
- Baris toggle + tombol aksi (`grid gap-2 sm:flex …`) ikut terjepit karena induknya kehabisan ruang.

## Rencana Perbaikan (UI saja)

1. **Kolom gambar**: ganti menjadi lebar tetap yang aman di semua ukuran — penuh saat bertumpuk (mobile), lebar tetap ±12rem hanya saat mode berdampingan, dan hilangkan `shrink-0` di mode bertumpuk agar tidak pernah mendorong kolom form keluar.
2. **Kolom form**: pastikan `min-w-0` di setiap tingkat (baris, grid 2 kolom, tiap field) supaya input dan label bisa menyusut, bukan meluber.
3. **Baris kontrol**: susun toggle dan tombol urutan/hapus agar membungkus rapi (`flex-wrap`) dan tombol aksi tetap sejajar di kanan tanpa memotong.
4. **Ganti pendekatan layout baris** dari flex ke grid responsif (`grid-cols-1` → `grid-cols-[12rem,1fr]` pada layar lebar), yang lebih tahan terhadap konten lebar dan menghapus kemungkinan overflow.
5. **Bar simpan lengket**: beri jarak bawah pada daftar agar konten terakhir tidak tertutup, dan bar tidak menimpa teks.
6. **Kartu "Pengaturan Slider"** diperiksa ulang ringan agar switch dan input tidak berdesakan di layar kecil.
7. **Verifikasi**: cek tampilan pada lebar 390 px, 768 px, dan 1280 px, pastikan tidak ada overflow horizontal.

## Catatan teknis

- Hanya menyentuh `src/components/admin/HomeBannerManager.tsx` (kelas Tailwind/struktur markup). Tidak ada perubahan logika simpan, unggah, urutan, database, atau RLS.
