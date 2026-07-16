
## Tujuan
Menyamakan tema visual tab **Safety Check**, **General Check Up**, dan **Estimasi** pada SPK Canvas v2. Saat ini tab Estimasi sudah memakai gaya *liquid glass* (backdrop-blur, border `white/10`, aksen primary), sedangkan Safety & General masih memakai gaya lama (kartu putih flat, border abu, aksen merah `#ff0000`). Kita samakan semua ke **liquid glass** — konsisten dengan identitas Apple-style/liquid glass proyek.

## Perubahan (khusus tampilan)

1. **`MechanicTabs.tsx`** — bungkus utama & tab header
   - Ganti wrapper `bg-white border-gray-200` → panel liquid glass: `border border-white/15 bg-white/5 backdrop-blur-xl shadow-xl rounded-2xl`.
   - Tab header: `bg-gray-50 border-gray-200` → `bg-white/5 border-white/10 backdrop-blur-md`.
   - Tombol tab: hilangkan `#ff0000` hardcoded, pakai token `primary`. Active = `bg-primary text-primary-foreground`, inactive = `bg-white/5 text-muted-foreground border-white/10 hover:bg-primary/10 hover:text-primary`.

2. **`ChecklistGroup.tsx`** — judul & kontainer grup
   - Judul: `text-foreground` dengan garis bawah tipis `border-white/10`, aksen kiri `bg-primary/70` (bukan merah polos).
   - Kontainer: `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md` menggantikan panel putih.

3. **`ConditionRow.tsx`** — baris GOOD / OK / BAD + Note
   - Baris: `bg-white/5 border-white/10` untuk baris ganjil, `bg-white/[0.03]` untuk `alt` genap.
   - Label pakai `text-foreground`; sub-label `text-muted-foreground`.
   - Tombol GOOD/OK/BAD selaras dengan gaya di Estimasi (`ring-1`, `shadow-[0_0_12px…]`): GOOD = emerald, OK = amber, BAD = destructive; inactive = `bg-white/5 text-muted-foreground`.
   - Input Note: `bg-background/40 border-white/10 focus:border-primary/60 focus:ring-primary/40`.

4. **`LampsRow.tsx`** — chip HEAD/FOG/TURN/REVERSE/REAR/BRAKE
   - Chip: `bg-white/5 border-white/10 text-muted-foreground`, active `bg-primary/20 text-primary ring-1 ring-primary/40`.
   - Sisakan struktur baris seperti `ConditionRow` yang sudah diperbarui.

5. **`TyreCheckPanel.tsx`** — diagram ban & input kedalaman
   - Panel: `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md`.
   - Header FL/FR/RL/RR: tombol pakai style yang sama dengan tab (primary token).
   - Input teks & angka: `bg-background/40 border-white/10 focus:border-primary/60`.
   - Radio "Bawa pulang / Ditinggal": chip glass, active `bg-primary/20 ring-primary/40`.

6. **`EstimasiTable.tsx`** — sudah liquid glass; hanya samakan **radius** wrapper luar menjadi `rounded-none` (karena sudah dibungkus panel `MechanicTabs`) dan hilangkan header `Estimasi Pergantian Spareparts` duplikat bila terlihat redundan setelah wrapper baru. Tidak ada perubahan logika.

## Yang tidak diubah
- Struktur data, `useBinding`, kunci field, urutan section, isi checklist.
- File di luar folder `src/components/spk/canvas/v2/`.
- Warna semantic token global (`index.css`) — hanya pakai token yang sudah ada (`--primary`, `--background`, `--foreground`, `--muted-foreground`, `--destructive`).

## Verifikasi
- Buka `/spk/:id` (Canvas v2), cek 3 tab: wrapper, header tab, judul grup, baris kondisi, chip lampu, panel ban, tabel estimasi — semua memakai border `white/10`, background `white/5`, blur, dan aksen `primary`.
- Cek mode gelap tetap konsisten (semua pakai token, tidak ada `#ff0000`/`bg-white` hardcoded).
