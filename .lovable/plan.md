## Masalah

Pada page **/manual-payment** ("Konfirmasi & Upload Bukti"), card input **Tanggal Transfer** terlihat lebih besar/tinggi dari **Nominal**. Penyebabnya bukan layout grid (sudah `grid-cols-2` simetris dengan `min-w-0`), tapi **styling native iOS Safari untuk `<input type="date">`**:

1. iOS Safari menambahkan padding internal pada `type="date"` sehingga tinggi visual lebih besar dari `type="text"` (Nominal), walaupun keduanya pakai komponen `<Input>` yang sama (default `h-10`).
2. iOS juga sering meng-center teks tanggal, sehingga visual width terkesan lebih lebar.
3. Beberapa device memberi border radius berbeda pada native date picker.

## Yang akan dikerjakan

Tambahkan kelas Tailwind kecil pada **`<Input type="date">`** untuk menetralkan native styling iOS supaya identik dengan input nominal di sebelahnya:

- `appearance-none` → menonaktifkan styling native
- `h-10` eksplisit (sama dengan default Input — memastikan tidak di-override iOS)
- `leading-none` → tinggi teks konsisten
- `text-base` → match Input default
- `[&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:m-0` → rata kiri sama dengan input text di kiri, hilangkan margin internal

Hasil: kedua card simetris (sama tinggi, sama alignment) di iOS, Android, dan desktop.

### File yang diubah

- `src/pages/ManualPayment.tsx` (line ~419, satu input date)

### Konsistensi (juga periksa & samakan)

Periksa input `type="date"` lain yang punya layout 2-kolom serupa supaya tidak muncul bug yang sama:

- `src/components/payment/InlineProofUpload.tsx` (line ~189)
- `src/components/admin/keuangan/UploadProofDialog.tsx` (input date Tanggal Transfer)

Tambahkan kelas yang sama jika input date di sana juga berdampingan dengan input lain dalam grid.

## Tidak ada perubahan backend/DB/RLS

Hanya CSS class pada komponen frontend.
