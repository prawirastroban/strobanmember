# Archived Pages

File di folder ini **tidak diimpor oleh `App.tsx`** dan tidak dapat diakses user.
Tujuan: tetap menyimpan referensi untuk developer (jangan dihapus).

Aturan:
- Jangan re-import file di sini dari kode produksi.
- Setiap file harus diberi header `// @archived YYYY-MM-DD — replaced by <route baru>.`
- Jika butuh dipakai lagi, pindahkan keluar folder ini dan daftarkan ke `pageRegistry.ts`.

## Daftar
- `ServiceHistory.tsx` — digantikan oleh `HistoryPerawatan.tsx` (route `/profile/history-perawatan`).