
## Masalah dari PDF yang diunggah

Setelah menganalisis `SPK-SPK_TASI5270_...pdf` (halaman 1), penempatan yang tidak simetris berasal dari beberapa titik di `src/pages/SPKPrint.tsx`:

1. **Kartu Pelanggan vs Kendaraan** — label `min-w-[90px]` terlalu sempit sehingga nilai panjang (mis. "DIGITAL MARKETING DIVISION STROBAN AUTO") membungkus 2 baris, membuat tinggi kartu kiri ≠ kanan.
2. **Order Sales Advisor (KVGroupCard 2 kolom)** — baris kiri & kanan tidak sejajar: label kiri pakai `min-w-[110px]`, tetapi "PAKET SERVICE" / "ORDER LAINNYA" lebih panjang sehingga nilai bergeser. "Bonus" hanya di kolom kiri → kolom kanan kosong tanpa placeholder.
3. **Legenda** — chip status `empty` tampil sebagai "—" kosong yang mengganggu ritme baris.
4. **GroupCard 2 kolom (Engine/Brake/Fluid, AC, Suspension, Tyre checks)** — item dengan `note` (baris kedua italic) membuat sel kiri lebih tinggi dari sel kanan pada baris yang sama → grid terlihat "patah".
5. **Lamps / Electrical (compact)** — kartu kiri & kanan tidak sama tinggi karena jumlah item berbeda.
6. **Signature block** — garis bawah 3 kolom tidak sejajar bila salah satu tanda tangan kosong (tinggi container = 64px tetap, tapi konten kadang center vs bottom).
7. **Estimasi table** — kolom "Nama" tanpa lebar tetap → subtotal & status chip meloncat posisi antar baris.
8. **Header SPK** — nomor SPK panjang (`SPK/TASI5270/202607/0006`) bertabrakan visual dengan tanggal & status pill karena tidak ada lebar minimum.

## Rencana Perbaikan (UI-only, file `src/pages/SPKPrint.tsx`)

### A. Kartu KV (Pelanggan & Kendaraan)
- Lebar label seragam `min-w-[110px]` + `max-w-[110px]` (fixed grid), nilai `flex-1 break-words`.
- Bungkus kedua kartu dalam grid dengan `items-stretch` supaya tinggi kiri = kanan.
- Nilai panjang tidak lagi membungkus label; naik-turun baris hanya di kolom nilai.

### B. KVGroupCard (Order Sales Advisor, Work Times)
- Ganti grid `grid-cols-2` menjadi `[grid-template-columns:110px_1fr_110px_1fr]` (label|value|label|value) supaya kolom label kiri & kanan sama persis.
- Jika jumlah item ganjil, isi sel terakhir dengan placeholder kosong agar grid tetap simetris.

### C. Legenda
- Sembunyikan token `empty` dari daftar legenda (`["ok","warn","not","na"]`) — token kosong tidak informatif di legenda.

### D. GroupCard 2 kolom (Engine/AC/Suspension + Tyre checks)
- Ganti `grid grid-cols-2 gap-x-3 gap-y-1.5` menjadi grid `items-start` + `auto-rows-fr` sehingga setiap baris memiliki tinggi seragam meskipun ada note.
- Berikan `InspRow` tinggi minimum konsisten (`min-h-[34px]`) dan note dipotong ke max 2 baris (`line-clamp-2`) untuk mempertahankan ritme.

### E. Lamps & Electrical (compact)
- Bungkus dua kartu di grid `items-stretch`; SectionShell diberi `h-full flex flex-col` supaya kartu kiri & kanan sama tinggi.
- Padding & jumlah row divisualkan konsisten.

### F. Signature Block
- Container `h-16 items-end` diganti `h-20 flex flex-col justify-end`; garis pemisah selalu di posisi sama walau tanda tangan kosong.
- Label di bawah selalu 1 baris, `truncate`.

### G. Estimasi Table
- Tetapkan lebar kolom eksplisit via `<colgroup>`: Nama 38%, Qty 8%, Harga 16%, Subtotal 16%, Urg 10%, Persetujuan 12% agar setiap baris sejajar.
- Tambahkan `tabular-nums` pada semua kolom numerik (sudah sebagian; lengkapi).

### H. Header SPK
- Bungkus judul kiri dengan `min-w-0` + `truncate` pada nama cabang.
- Blok kanan diberi `shrink-0 text-right whitespace-nowrap` supaya SPK number tidak wrap dan Status pill selalu di baris sendiri.

### I. Detail kecil
- Global: naikkan `gap-y` grid dari `1.5` menjadi `2` untuk breathing room konsisten.
- Border-dashed baris KV: pastikan setiap baris punya `min-h-[20px]` supaya tidak "meloncat" saat nilai kosong ("—").

## File yang Disentuh
- `src/pages/spk/SPKPrint.tsx` — seluruh perubahan layout di atas.
- Tidak ada perubahan logika data / `spkDisplayMap.ts` / komponen Canvas.

## Verifikasi
- Buka salah satu SPK yang sudah closed → tombol **Unduh PDF** → periksa:
  1. Kartu Pelanggan & Kendaraan sama tinggi, label rata kiri.
  2. Order Sales Advisor: label & nilai 4 kolom sejajar sempurna.
  3. Engine/AC/Suspension: pasangan baris kiri-kanan sejajar meski ada note.
  4. Lamps & Electrical: dua kartu sama tinggi.
  5. Tanda tangan: 3 garis sejajar horizontal, label rapi.
  6. Estimasi: kolom lurus dari header sampai baris terakhir.
- Bandingkan dengan versi lama menggunakan SPK yang sama (`SPK/TASI5270/202607/0006`).
