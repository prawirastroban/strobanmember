## Masalah
Pada baris **Lamps** di panel "Other Components Check", kolom Note terjepit hingga input hampir tak terlihat dan label "NOTE" ikut pecah jadi dua baris ("NO / TE"). Penyebabnya di `src/components/spk/canvas/v2/LampsRow.tsx`: tombol HEAD/FOG/TURN/REVERSE/REAR/BRAKE memakai `flex-wrap` tanpa lebar tetap, sehingga saat mereka melebar mereka menelan ruang kolom Condition dan Note yang berbagi baris flex yang sama.

## Perbaikan (UI-only, LampsRow.tsx)
1. **Struktur ulang layout jadi dua baris logis pada layar sempit, satu baris pada layar lebar**
   - Bungkus label + grup sub-lamps + Condition dalam satu row atas.
   - Bungkus Note dalam row bawah dengan `w-full md:flex-1 md:min-w-[240px]`, sehingga di mobile Note ambil satu baris penuh; di desktop tetap sejajar tapi punya lebar minimum.
2. **Kunci lebar grup sub-lamps** — gunakan `grid grid-cols-3 gap-1.5 md:w-[220px]` alih-alih `flex-wrap` bebas, agar 6 tombol jadi 3×2 rapi tanpa mengambil ruang kolom lain.
3. **Cegah label pecah** — tambahkan `whitespace-nowrap` pada label "NOTE" dan "CONDITION".
4. **Beri Note tinggi & padding yang cukup** — naikkan input dari `p-2 text-sm` ke `h-10 px-3 text-sm`, sejajarkan visual dengan Wiper/Battery rows sehingga tampak proporsional.
5. **Konsistensi ConditionRow** — verifikasi `ConditionRow.tsx` (yang dipakai Wiper Blades / Wiper Fluid / Battery) sudah punya Note dengan lebar cukup; jika perlu tambahkan `md:min-w-[240px]` dan `whitespace-nowrap` yang sama supaya semua baris di panel ini konsisten.

Tidak ada perubahan pada binding, data, validasi, atau logic runtime — murni tata letak dan class Tailwind.

## File terdampak
- `src/components/spk/canvas/v2/LampsRow.tsx` (perubahan utama)
- `src/components/spk/canvas/v2/ConditionRow.tsx` (penyelarasan Note kalau lebar minimumnya belum ada)
