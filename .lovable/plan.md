
## Tujuan
Menyamakan hasil PDF SPK dengan seluruh input pada Canvas — Section 1–4 (admin) dan Canvas v2 tab Safety / General / Estimasi (mekanik). Saat ini PDF membaca key lama sehingga hasil input mekanik v2 (`chk_*_cond`, `lamps_flags`, `tyre_${pos}_cond`, seluruh Estimasi) tidak ikut muncul.

## Root cause
1. `src/lib/spk/spkDisplayMap.ts` → helper `inspection(d, code, …)` hanya membaca satu key. Canvas legacy menulis `engine_oil`, tapi Canvas v2 menulis `chk_engine_oil_cond`. Tidak ada fallback.
2. `tokenize()` hanya mengenal 2 tier — nilai `"good"` dan `"ok"` sama-sama dipetakan ke `ok`, sehingga tier tengah (OK kuning) hilang. Nilai `"bad"` → `not` sudah benar.
3. `Lamps` di PDF membaca `lamp_head/lamp_fog/…`, tapi Canvas v2 hanya menyimpan `lamps_flags` (map on/off) + satu kondisi umum `lamps_cond`.
4. Tidak ada bagian **Estimasi Pergantian Spareparts** di PDF, padahal ini output utama mekanik v2.
5. Note per baris (`chk_*_note`, `tyre_${pos}_note`, `lamps_note`) tidak ditarik ke `DisplayItem`, jadi PDF cuma menampilkan status tanpa catatan mekanik.
6. Ban Bekas (`tyre_ban_bekas`) sudah ditarik tapi label PDF "—" saja tanpa formatter human-readable (`bawa` → "Bawa pulang").

## Perubahan

### A. `src/lib/spk/spkDisplayMap.ts`
1. **Tambah tier status baru**:
   - `StatusToken`: `"ok" | "warn" | "not" | "na" | "empty"`.
   - `tokenize`: `"good"|true|"OK"` → `ok`; `"ok"` (v2 middle) → `warn`; `"bad"|false|"NOT"` → `not`; `"na"` → `na`; else `empty`.
   - `STATUS_PALETTE.warn`: kuning (`bg #FEF3C7`, `fg #92400E`, `border #FCD34D`, label `"OK / Perhatian"`).
2. **Perluas `inspection()`**: `inspection(d, ["chk_engine_oil_cond","engine_oil"], "Engine Oil", "chk_engine_oil_note")` — cari nilai pada daftar key, ambil note dari key note pertama yang ada isinya. Tambahkan `note?: string` di `DisplayItem`.
3. **Update kelompok Engine / Electrical / Lamps / AC / Suspension** supaya membaca kedua keyspace (v2 lebih dulu, fallback legacy). Lamps khusus:
   - Baca `lamps_flags` map (HEAD/FOG/TURN/REVERSE/REAR/BRAKE) → jadikan `DisplayItem[]` per sub-lamp dengan status `ok` kalau `true`, `empty` kalau tidak diisi.
   - Fallback ke key lama `lamp_head/lamp_fog/lamp_side/lamp_rear/lamp_brake` bila `lamps_flags` kosong.
   - Tambahkan `note` grup dari `lamps_note`.
4. **Tyre**: tarik `tyre_${pos}_cond` (v2) dengan fallback `tyre_${pos}_status`, sertakan `note` per posisi. Format Ban Bekas: `bawa` → "Bawa pulang", `tinggal` → "Ditinggal di bengkel".
5. **Estimasi (baru)**: fungsi/tipe `EstimasiDisplay` yang mengembalikan:
   - `items: {nama, qty, harga, subtotal, urgensi ('ok'|'bad'|'—'), persetujuan ('yes'|'no'|'—')}[]`
   - `totalItems`, `subtotal`, `diskon_jasa`, `diskon_sparepart`, `total`
   - Formatter Rp id-ID.
   - Ekspor via `SpkDisplay.estimasi`.

### B. `src/pages/spk/SPKPrint.tsx`
1. Render **Estimasi Pergantian Spareparts** di antara Suspension dan Catatan Mekanik:
   - Header baris (Nama, Qty, Harga, Subtotal, Urgensi, Persetujuan).
   - Summary grid: Produk / Sub Total / Diskon Jasa / Diskon Sparepart / **Total**.
   - Skip render bila `items.length === 0` dan subtotal `= 0`.
2. Perbarui `<InspRow>` untuk menampilkan `note` di baris bawah kalau ada (`text-[9px] text-black/60 italic`).
3. Tambahkan chip `"warn"` (kuning) di legenda dan `<StatusChip>` (otomatis via `STATUS_PALETTE` yang sudah punya `warn`).
4. Setelah grid Lamps, kalau ada `lamps_note` tampilkan di bawah kelompok (sudah otomatis via `GroupCard`'s `note`).

### C. Sanity — pastikan Signatures & Section 1–4 sudah ok
Section 1–4 (Customer, Vehicle, Complaint, ServiceOrder, Signatures Admin/Customer/Mekanik) di Canvas legacy sudah pakai key yang dibaca `spkDisplayMap` (`customer_name`, `vehicle_plate`, `service_pkg_petrol`, `signature_admin/customer/mekanik`, dst.) — tidak perlu diubah. Hanya konfirmasi via read.

## Yang tidak diubah
- Tabel database, RLS, edge functions.
- Alur penyimpanan Runtime (kunci field Canvas v2 tetap `chk_*_cond` — tidak dipindah, hanya PDF yang diperluas).
- Layout PDF di luar bagian Estimasi & warna status baru.

## Verifikasi
1. Buka SPK yang sudah diisi mekanik (Safety/General/Estimasi) → klik **Cetak**.
   - Item Engine/Brake/AC menampilkan status 3-tier (hijau/kuning/merah) sesuai input Canvas v2.
   - Setiap baris menampilkan note bila diisi.
   - Bagian Lamps memuat sub-lamp yang aktif.
   - Bagian **Estimasi** muncul dengan baris item, urgensi, persetujuan, dan total yang cocok dengan tampilan Canvas.
2. Buka SPK lama (dari data legacy) → PDF tetap terisi seperti sebelumnya (fallback key lama).
3. `Unduh PDF` menghasilkan file yang identik dengan tampilan cetak.
