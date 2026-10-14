# Admin Cabang Bisa Konfirmasi Pemeriksaan Akhir (Final Check) di SPK

## Temuan saat ini
- Di tabel workflow (`spk_workflow_transitions`, workflow `spk_default`), Admin Cabang sudah bisa: kirim ke customer, mulai pengerjaan, kirim ke Final Check (`qc_pending`), dan langsung `closed` dari `qc_pending`.
- Namun transisi **konfirmasi hasil pemeriksaan akhir** — `qc_pending → qc_passed` (lolos) dan `qc_pending → qc_failed` (perlu perbaikan ulang) — **belum ada sama sekali** di database, untuk peran mana pun. Jadi tombol "Mekanik — Final Check Selesai" / "Perlu Perbaikan Ulang" tidak pernah muncul.
- Konfigurasi peran (`spk.role_profiles` di app_settings) sudah memberi Admin Cabang hak edit bagian `approval`, jadi tidak perlu diubah.

## Yang akan dikerjakan

1. **Tambah transisi Final Check untuk Admin Cabang (migrasi database)**
   - `qc_pending → qc_passed` dengan actor `admin_cabang`
   - `qc_pending → qc_failed` dengan actor `admin_cabang`
   - `qc_failed → in_progress` dengan actor `admin_cabang` (agar SPK yang gagal final check bisa dikerjakan ulang, tidak macet)
   - Sekaligus tambahkan untuk `owner` dan `admin` agar alur seragam di semua cabang/pusat.

2. **Verifikasi tombol muncul di Canvas SPK**
   - Hook `useSPKWorkflow` otomatis menampilkan aksi berdasarkan transisi yang tersedia, jadi setelah migrasi, Admin Cabang akan melihat tombol "Final Check Selesai" dan "Perlu Perbaikan Ulang" saat SPK berstatus Final Check — tanpa perlu ubah kode UI.
   - Uji lewat preview: masuk sebagai Admin Cabang, buka SPK berstatus Final Check, pastikan kedua tombol muncul dan berfungsi (status berubah, tercatat di riwayat timeline).

## Catatan teknis
- Migrasi hanya `INSERT` ke `spk_workflow_transitions` (mengacu `workflow_id` dari `spk_workflow_definitions` code `spk_default`) — tidak mengubah/menghapus data existing.
- Tidak ada perubahan RLS, tidak ada perubahan kode aplikasi; perilaku mekanik dan customer tidak berubah.
- Label tombol sudah ada: "Mekanik — Final Check Selesai" (hijau) dan "Mekanik — Perlu Perbaikan Ulang" (merah); bila mau, label bisa disesuaikan jadi netral ("Final Check Selesai") karena kini Admin Cabang juga bisa menekannya.
