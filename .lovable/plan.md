# Tombol filter pricelist dibuat lebih tipis & compact

## Kondisi saat ini (sudah diukur di preview)

- Tiap tombol pilihan filter (mis. "ACCELERA 88", "R13", "14PR S501") tingginya **44px**, padahal isi teksnya hanya 16px. Penyebabnya: batas tinggi minimum 44px dari ukuran tombol bawaan masih berlaku, sehingga padding 4px di atas-bawah tidak berpengaruh.
- Jarak label dan angka jumlah 8px, jarak antar-tombol 6px, huruf 12px.
- Akibatnya panel filter tab Ban dengan 4 grup terbuka tingginya **1.334px**, dan daftar Pattern (206 pilihan) butuh scroll panjang.
- Judul grup 20px + jarak 8px ke isinya, jarak antar grup 20px, bantalan dalam panel 20px.

## Yang akan berubah

1. **Tombol pilihan filter jadi tipis**: tinggi 44px → sekitar 20px di layar besar dan 24px di HP (batas minimum sentuh diturunkan). Padding 4px → 2px, huruf 12px → 11px, jarak label–angka 8px → 4px, jarak antar-tombol 6px → 4px.
2. **Judul grup lebih ramping**: tanda `>` dan garis merah dikecilkan sedikit, jarak judul ke isi diperkecil.
3. **Panel lebih rapat**: jarak antar grup 20px → 14px, bantalan dalam panel 20px → 16px.
4. **Daftar Pattern tetap bisa di-scroll**, tapi karena barisnya lebih pendek, jendelanya dilebarkan sehingga lebih banyak pilihan terlihat sekaligus.
5. **Tidak berubah**: penanda aktif tetap merah, badge jumlah pilihan, angka di samping tiap tombol, perilaku buka/tutup grup, grup otomatis terbuka saat punya pilihan, tombol Reset filter, dan tombol Daftar Golongan Kendaraan (tetap hanya di tab Jasa).

Target: panel filter Ban dengan semua grup terbuka turun dari 1.334px menjadi di bawah 700px, tanpa ada teks terpotong.

## Detail teknis

Hanya di `src/pages/Pricelist.tsx`, tidak ada perubahan data maupun aturan akses:

- Baris 131-135 (tombol opsi filter): mengganti `px-2.5 py-1 text-xs` menjadi `px-2 py-0.5 text-[11px] leading-[14px]`, menambah `gap-1` (menimpa `gap-2` bawaan) dan `min-h-[24px] lg:min-h-[20px]`. Batas minimum baru ini menimpa `min-h-[44px]` dari ukuran tombol bawaan karena `cn` memakai tailwind-merge (pemisah konflik kelas), sama seperti yang sudah terbukti berhasil pada bilah kategori.
- Baris 127 (wadah opsi): `gap-1.5` → `gap-1`; jendela scroll Pattern `max-h-48` → `max-h-64` (±10 baris terlihat, sebelumnya hanya ±4).
- Baris 119-124 (judul grup): `mb-2` → `mb-1.5`, `gap-2` → `gap-1.5`, ikon chevron `h-4 w-4` → `h-3.5 w-3.5`, batang merah `h-4 w-1` → `h-3.5 w-0.75`.
- Baris 74: `space-y-5` → `space-y-3.5` (jarak antar grup). Baris 286: `p-5` → `p-4` (bantalan panel).
- Baris 77 (tombol Daftar Golongan Kendaraan), 143 (Reset filter), dan seluruh blok tabel/search bar tidak disentuh.

## Pemeriksaan

- Playwright di localhost:8080 dengan sesi staf: ukur tinggi tombol filter sebelum (44px) dan sesudah (target ±20px desktop, ±24px HP), serta tinggi panel Ban dengan 4 grup terbuka (1.334px → target < 700px).
- Cek keempat tab (Ban, Oli, Spareparts, Jasa): label dan angka terbaca utuh, tombol aktif tetap merah jelas, tidak ada teks terpotong, dan halaman tidak melebar keluar layar.
- Cek HP 390px: sheet filter terbuka, tombol tetap nyaman disentuh (klik memilih nilai dan badge jumlah muncul), popup Golongan Kendaraan di tab Jasa tetap normal.
