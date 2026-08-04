Perapihan Pemilihan Cabang di Halaman Booking

## Tujuan
Mengubah tampilan pemilihan cabang di `PickupLocationSection` agar lebih rapih, minimalis, dan tetap mudah dipahami pengguna.

## Opsi yang Diajukan

### Opsi A — Dropdown Select Minimalis (Direkomendasikan)
Mengganti horizontal card list cabang menjadi komponen `<Select>` bawaan shadcn/ui.

Perubahan:
- Trigger select menampilkan cabang aktif (icon gedung + nama + alamat singkat).
- Saat dibuka, daftar cabang ditampilkan sebagai scrollable dropdown dengan nama dan alamat.
- Opsi "Cabang Terdekat" tetap tersedia saat mode pick-up dan koordinat sudah dideteksi.
- Menghemat ruang vertikal dan menghilangkan scroll horizontal.

### Opsi B — Compact Card List
Mempertahankan bentuk kartu, tetapi lebih padat dan terstruktur.

Perubahan:
- Kartu cabang diperkecil (tinggi lebih rendah, teks lebih ringkas).
- Area kartu dibatasi tingginya dengan scroll internal.
- Ditambahkan pencarian/filter nama cabang di atas daftar.
- Tetap mempertahankan pola visual yang sudah dikenali pengguna.

## Rekomendasi Teknis
- Pakai Opsi A karena paling sesuai dengan permintaan "dropdown" dan menghasilkan layout paling bersih di mobile.
- Gunakan `src/components/ui/select.tsx` yang sudah ada; tidak perlu instalasi baru.
- Pertahankan semua logika bisnis: `selectedBranchSlug`, `onSelectBranchSlug`, auto-detect cabang terdekat, dan sinkronisasi mode pick-up.
- Hanya ubah bagian render daftar cabang pada mode "Datang ke Bengkel".

## File yang Diubah
- `src/components/booking/PickupLocationSection.tsx` — bagian render "Pilih Cabang".

## Yang Tidak Berubah
- State management, props, dan callback `PickupValue`.
- Logika GPS / link Maps / pick-up fee.
- Data cabang tetap dari `fetchBranchesWithGeo()`.

## Verifikasi
- Screenshot mobile 393x852 untuk memastikan dropdown tidak terpotong dan mudah di-tap.
- Typecheck (`tsc --noEmit`) setelah perubahan.
