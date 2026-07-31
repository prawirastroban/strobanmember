## Hasil verifikasi (sudah dicek langsung)

Database & kode sudah saya periksa:

1. **Analisis kesehatan AI belum muncul di sisi pelanggan.** Halaman `HistoryPerawatan.tsx` (Riwayat Perawatan), `ReminderService.tsx` (Pengingat Servis), `MyVehicles.tsx`, dan `VehicleDetail.tsx` tidak punya satu pun referensi ke SPK maupun `ai_health_report`. Kartu `AIHealthCard` saat ini hanya dipanggil dari Canvas SPK (sisi admin/mekanik).
2. **Belum ada data analisis AI sama sekali.** Semua baris `spk_orders` (15 terbaru) punya `ai_health_report = NULL` — termasuk 3 SPK milik akun Prawira (`SPK/TASI5270/…0001` closed, `…0004` dan `…0005` in_progress). Jadi walaupun UI-nya dipasang, tanpa generate laporan tidak akan ada yang tampil.
3. **Akun Prawira ada dua profil**: `prawira.stroban@gmail.com` (punya 2 kendaraan: Mercedes G 63 "B 4 GUS", BMW M3 Touring "Z 4 MAL") dan satu profil "Prawira Zamal Mustofa" (BMW E30 "Z 4 SHK"). Tidak ada booking pada kedua akun ini, sehingga Riwayat Perawatan kemungkinan kosong dan perlu diuji lewat data SPK, bukan booking.

Kesimpulan: permintaan "pastikan hasil analisis AI muncul di history servis & pengingat dan di data kendaraan" **belum terpenuhi** — perlu pengerjaan, bukan sekadar pengetesan.

## Rencana

### 1. Tampilkan Kesehatan AI di halaman pelanggan
- Buat hook ringan `useVehicleHealthReports` yang mengambil `spk_orders` milik user login (`customer_id = auth.uid()`), field: `id, spk_number, vehicle_id, ai_health_report, opened_at, closed_at`, lalu memetakannya per kendaraan (laporan terbaru per `vehicle_id`).
- Buat komponen ringkas `VehicleAIHealthSummary` (skor, status, ringkasan, temuan utama, rekomendasi) memakai token warna dari `vehicleHealth.ts` — gaya liquid glass konsisten dengan kartu SPK yang ada.
- Pasang komponen tersebut di:
  - **Riwayat Perawatan** (`/profile/history-perawatan`): satu blok "Kesehatan Kendaraan (AI)" di atas daftar riwayat + tautan ke SPK terkait.
  - **Pengingat Servis** (`ReminderService.tsx`): tampilkan rekomendasi & `next_service_km` dari laporan AI sebagai sumber pengingat tambahan.
  - **Data Kendaraan**: badge status di kartu `MyVehicles.tsx` dan panel lengkap di `VehicleDetail.tsx`.
- Bila belum ada laporan untuk kendaraan tersebut, tampilkan empty state yang jelas (bukan komponen kosong).

### 2. Pastikan laporan AI benar-benar dihasilkan
- Panggil edge function `spk-health-analysis` untuk SPK yang sudah selesai supaya `ai_health_report` terisi (fungsi sudah punya fallback deterministik bila AI gateway gagal).
- Tambahkan pemicu otomatis: saat SPK berpindah ke status selesai/closed, panggil `spk-health-analysis` sekali (guard agar tidak dobel) sehingga pelanggan selalu punya laporan tanpa aksi manual.

### 3. Pengujian dengan akun Prawira
- Generate laporan AI untuk SPK Prawira (`SPK/TASI5270/…0001` yang sudah closed), lalu jalankan Playwright memakai sesi login Prawira dan tangkap tangkapan layar mobile dari: Riwayat Perawatan, Pengingat Servis, Daftar Kendaraan, dan Detail Kendaraan — memastikan kartu kesehatan AI tampil dengan data nyata.
- Verifikasi juga akses RLS: pelanggan hanya bisa membaca SPK miliknya sendiri.

### Catatan teknis
- Kaitan SPK ↔ kendaraan memakai `spk_orders.vehicle_id`; untuk SPK lama yang `vehicle_id`-nya kosong, pencocokan cadangan lewat nomor polisi di `spk_orders.data`.
- Tidak ada perubahan skema database; hanya penambahan komponen baca-saja + satu pemicu analisis.
