# Percepat daftar SPK di aplikasi Android

## Penyebab (sudah dicek)
- Daftar SPK mengunduh **seluruh isi form** (`data`) dari 404 SPK sekaligus (~750 KB terkompresi, jauh lebih besar setelah dibuka) hanya untuk menampilkan kartu ringkas.
- Cache daftar disimpan di `sessionStorage`, yang hilang setiap kali Android menutup aplikasi di latar belakang — jadi tiap buka lagi selalu loading penuh.
- Setiap aplikasi kembali fokus dan setiap perubahan realtime memicu muat ulang penuh tanpa jeda (bisa beruntun).

## Perbaikan (tanpa ubah flow/logic)
1. **Ambil kolom ringkas saja**: query daftar hanya meminta field JSON yang dipakai kartu (nama, HP, plat, merk/tipe/tahun, cabang, tanggal booking, mekanik, ringkasan servis, field progres) via JSON path select, bukan seluruh `data`.
2. **Muat bertahap**: 200 SPK terbaru tampil dulu, sisanya dimuat di latar belakang lalu digabung (filter/pencarian tetap bekerja atas seluruh data setelah selesai).
3. **Cache tahan lama**: pindahkan cache ke `localStorage` per user (`spk:list:v2:<userId>`), sehingga saat app dibuka ulang daftar langsung tampil lalu diperbarui diam-diam.
4. **Debounce refresh**: realtime + fokus digabung jadi satu muat ulang per ±1,5 detik, dan refresh fokus dilewati bila data baru dimuat < 30 detik lalu.
5. Tetap pakai batas waktu + tombol "Coba lagi" yang sudah ada bila koneksi gagal.

## Detail teknis
- File: `src/pages/spk/admin/SPKAllList.tsx` (fetchAllSpkListRows, cache, effect reload/realtime).
- `computeCanvasProgress` & `buildServiceSummary` diberi snapshot parsial; cek field yang dibaca lalu sertakan path-nya di select.
- Verifikasi: Playwright di viewport HP — ukuran respons turun, daftar tampil instan dari cache setelah reload.
- Perubahan ini web-code: masuk ke Android lewat Publish (tidak perlu AAB baru).
