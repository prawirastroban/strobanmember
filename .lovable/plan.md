## Tujuan
Memperbaiki bug UI di SPK Canvas v2: field **Note** saat ini berada di samping tombol **GOOD/OK/BAD**, sehingga pada label panjang atau layar sempit tombol condition tergeser ke kanan dan terpotong. Solusinya: pindahkan input **Note** ke bawah baris condition.

## Perubahan

### 1. `src/components/spk/canvas/v2/ConditionRow.tsx`
- Ubah layout dari `flex-row` (label | condition | note) menjadi vertikal per baris:
  - Baris atas: label + tombol GOOD/OK/BAD dalam satu baris.
  - Baris bawah: input Note full-width di bawah tombol condition.
- Pertahankan styling glassmorphism, warna, dan glow yang sudah ada.
- Pastikan label "Note" tetap terlihat (jangan `hidden md:block`) agar jelas.

### 2. `src/components/spk/canvas/v2/LampsRow.tsx`
- Sama seperti `ConditionRow`: input Note dipindahkan ke bawah baris sub-lamp toggle + condition buttons.
- Pertahankan grid 3 kolom untuk sub-lamp (HEAD/FOG/TURN/REVERSE/REAR/BRAKE).

### 3. Verifikasi visual
- Preview halaman `/spk/:id` dengan akun mekanik.
- Pastikan klik GOOD/OK/BAD tetap stabil (tidak kosong kembali) — tidak mengubah logic binding.
- Pastikan input Note tidak lagi mendorong tombol ke kanan.

## Tidak termasuk
- Tidak mengubah logic `useBinding`, autosave, atau workflow.
- Tidak mengubah field keys atau data yang tersimpan.
