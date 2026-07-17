## Auto-Format Input pada Form SPK Baru

Ubah input pada `src/pages/spk/SPKNewForm.tsx` agar user cukup mengetik angka — pemisah ribuan, jam, dan menit ditambahkan otomatis. Nilai yang disimpan tetap normal (angka bersih untuk kilometer, format jam yang bisa diproses untuk waktu) supaya sinkron dengan Canvas & PDF.

### 1. Kilometer Sekarang & Kilometer Servis Berikutnya
- Saat mengetik: strip semua karakter non-digit, lalu tampilkan dengan pemisah ribuan titik (locale `id-ID`).
  - Ketik `82450` → tampil `82.450`.
- Simpan ke `form` sebagai string ter-format (`82.450`) — konsisten dengan placeholder & pembacaan Canvas yang sudah menerima string ini.
- Batas panjang: 9 digit murni (mendukung sampai `999.999.999` km).

### 2. Estimasi Waktu (`complaint_estimasi`)
- Auto-format numeric → durasi `jam` / `menit`.
  - Ketik `4` → `4 jam`.
  - Ketik `430` → `4 jam 30 menit` (2 digit terakhir dianggap menit bila ≥ 3 digit; menit dibatasi 0–59).
  - Ketik `30` (≤ 2 digit, tapi kalau user mau menit): sederhanakan — semua input 1–2 digit dianggap **jam**. Untuk memasukkan menit, user tetap bisa mengetik `030` (→ `0 jam 30 menit`).
- Placeholder diganti jadi `Ketik angka, mis. 4 = 4 jam`.

### 3. Waktu Konfirmasi (`complaint_konfirmasi`)
- Auto-format numeric → `HH:mm` 24 jam.
  - Ketik `1` → `1`; `14` → `14`; `143` → `14:3`; `1430` → `14:30`.
  - Hanya izinkan digit; batasi jam 0–23 dan menit 0–59 saat 4 digit lengkap.
- Placeholder: `1430 → 14:30`.

### 4. Helper kecil
Tambah util lokal di file yang sama (tidak buat file baru):
```ts
const formatThousand = (raw: string) => raw.replace(/\D/g, "").slice(0, 9)
  .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const formatDurasi = (raw: string) => { /* jam + menit */ };
const formatJamMenit = (raw: string) => { /* HH:mm */ };
```
Dipakai di `onChange` masing-masing `Input`. Tidak ada perubahan pada `setField`, skema Zod, atau payload submit — nilai yang di-simpan tetap string yang sudah ter-format.

### 5. Verifikasi
- Ketik angka pada 4 field yang dipilih → format muncul otomatis tanpa reset kursor secara janggal.
- Submit SPK, buka Canvas sebagai admin/mekanik → nilai muncul sama persis (mis. `82.450 km`, `4 jam 30 menit`, `14:30`).
- Cetak PDF → nilai konsisten (karena Canvas membaca string apa adanya).

### File yang disentuh
- `src/pages/spk/SPKNewForm.tsx` — hanya penambahan helper + perubahan `onChange` & `placeholder` untuk 4 input yang dipilih. Tidak ada perubahan file lain.
