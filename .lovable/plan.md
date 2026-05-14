## Ringkasan
Tambahkan daftar preview pelanggan target saat tombol **Dry-run** di-klik pada panel *Jadwal WA Reminder Review*. Hasil dry-run dari edge function sudah mengembalikan array `targets`, namun UI saat ini hanya menampilkan ringkasan angka di toast. Perlu ditampilkan inline seperti preview broadcast WA.

## Perubahan

### File: `src/components/admin/ReviewReminderSettings.tsx`

1. **State baru**
   - `dryRunResult`: menyimpan objek hasil dry-run `{ targets, count, valid_count, will_send_in_next_run }`.

2. **Handler `runTest` (branch `dryRun`)**
   - Selain toast ringkasan, simpan seluruh response `data` ke `dryRunResult`.
   - Toast tetap muncul sebagai notifikasi singkat.

3. **UI preview panel (inline)**
   - Render kondisional setelah area tombol *Test pengiriman* jika `dryRunResult` tidak null.
   - Panel berisi:
     - Header: judul "Preview Target Pengiriman" + tombol "Tutup" untuk mengosongkan state.
     - List scrollable (`max-h-48`) dengan item per baris:
       - Nama pelanggan (`name` atau fallback "Tanpa nama")
       - Nomor telepon asli (`phone`)
       - Badge **"Valid"** (hijau) jika `normalized` ada, atau **"Invalid"** (merah) jika null.
     - Footer ringkasan: Total / Valid / Akan dikirim.

4. **Edge function**
   - **Tidak perlu diubah**. Response `dry_run` sudah mengandung `targets` lengkap.

## Hasil Akhir
Admin dapat melihat secara langsung pelanggan mana saja yang masuk target reminder WA, mana yang nomornya valid, sebelum menekan *Kirim Sekarang*.