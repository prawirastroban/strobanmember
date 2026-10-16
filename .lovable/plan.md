# Pratinjau Scan SPK Ban mengikuti kertas Ban

## Yang diubah
Pratinjau hasil scan untuk **SPK Ban** tidak lagi memakai kolom SPK Service. Kelompok "Servis" (Mekanik, Oli, Jasa, Sparepart) dihapus. Kelompok "Catatan" hanya berisi satu isian **Catatan**; Keluhan, Estimasi, dan Catatan Mekanik dihapus.

Susunan pratinjau SPK Ban mengikuti Form Pelanggan Ban:
- **Customer**: Nama, No. HP, No Plat, Tanggal
- **Mobil & Ban**: Merk Mobil, Tipe Mobil, Tahun, Ukuran Ban, Merk Ban
- **History**: Merk/Tipe Lama, Ukuran Lama
- **Petugas**: Admin, Teknisi
- **Catatan**: Catatan

Isian yang kurang yakin tetap diberi tanda "cek ulang". Kalau isian ban diedit di pratinjau, hasilnya ikut masuk ke Data Ban di form. Pilihan layanan, kondisi, dan angka mm tetap terisi otomatis di Data Ban. Pratinjau SPK Service tidak berubah.

## Detail teknis
- `ocrPrefill.ts`: tambah `OCR_FIELD_DEFS_BAN` dan `OCR_GROUPS_BAN`. Isian ban (ukuran_ban, merk_ban, history_merk, history_ukuran, catatan) diambil dari `result.ban` ke `values` dengan awalan `ban_`. `composePrefill` menulis kembali nilai itu ke `extraData.ban`. Catatan disimpan di `ban.catatan`, tidak di `complaint_note`/`mechanic_note`.
- `SPKScanPreview.tsx`: terima prop `spkType` dan pilih daftar isian sesuai jenis SPK.
- `SPKScanDialog.tsx`: teruskan `spkType` ke `buildPrefill`, `composePrefill`, dan pratinjau.
- `spk-ocr-scan`: untuk SPK Ban, minta field `booking_date` (tanggal), selain field yang sudah ada.
