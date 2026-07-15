## Tujuan
Merombak tampilan card SPK di halaman **All SPK** (`/dashboard/spk/all`) agar lebih minimalis, ringkas, dan nyaman dibuka di layar mobile tanpa menghilangkan informasi penting atau aksi utama.

## Masalah Saat Ini
Card `SpkCardItem` saat ini menumpuk banyak elemen dalam satu blok:
- Header cabang + plat + status badge
- 3 baris info (pelanggan, kendaraan, nomor SPK)
- Separator
- Progress bar / status selesai + waktu + prioritas
- Separator kedua
- Tombol Edit & Hapus

Di layar sempit (< 400px) card terasa berat, jarak antar elemen padat, dan tombol aksi memakan ruang vertikal.

## Rencana Perubahan

### 1. Struktur Card Mobile-First
Mengubah card menjadi layout 2-baris utama di mobile:

```text
[Plat Nomor]                    [Status Badge]
[Pelanggan · Kendaraan · Tanggal]  [Ikon Prioritas]
```

- **Plat nomor** menjadi identitas utama (paling mudah dikenali mekanik).
- **Status badge** tetap di kanan atas.
- **Baris kedua** menyatukan nama pelanggan, kendaraan, dan tanggal service dalam satu baris dengan pemisah titik.
- **Nomor SPK** dipindahkan ke tooltip/title card, tidak ditampilkan langsung di mobile.
- **Progress bar** disederhanakan: hanya tampil di desktop; di mobile diganti dengan indikator kecil atau badge status saja.

### 2. Aksi Lebih Ringkas
- Di mobile, tombol **Edit** dan **Hapus** diganti dengan **ikon tombol** (Pencil + Trash2) atau dipindahkan ke dalam menu overflow (tiga titik) untuk menghemat ruang.
- Di desktop, tombol teks tetap ditampilkan karena ruang lebih longgar.
- Aksi utama tetap: tap card → buka detail SPK.

### 3. Responsive Breakpoints
- **Mobile (< 640px)**: layout 2 baris, ikon aksi, progress disembunyikan.
- **Tablet/Desktop (≥ 640px)**: layout yang lebih luas, progress bar tampil, tombol teks Edit/Hapus tampil.

### 4. Penyederhanaan Visual
- Hapus separator ganda; gunakan spacing dan warna saja untuk memisahkan section.
- Gunakan utility `truncate` agar teks panjang tidak memecah layout.
- Prioritas tinggi tetap ditandai dengan badge kecil merah, bukan teks panjang "PRIORITAS".

### 5. File yang Diubah
- `src/pages/spk/admin/SPKAllList.tsx` — komponen `SpkCardItem` dan styling card.

### 6. Verifikasi
- Preview di viewport mobile untuk memastikan card tidak overflow.
- Cek desktop viewport agar tidak kehilangan informasi penting.
- Pastikan tombol Edit/Hapus masih bisa diakses oleh `staff`, `admin`, dan `admin_cabang`.

## Hasil Akhir yang Diharapkan
Card SPK di mobile menjadi ringkas, mudah discan, dan tetap fungsional — pelanggan & plat nomor terlihat jelas, status badge tetap prominent, aksi Edit/Hapus tidak mengganggu layout.