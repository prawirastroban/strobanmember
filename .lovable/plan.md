Rencana perbaikan dashboard SPK agar datanya saling terintegrasi dengan seluruh SPK yang ada:

1. Perbaiki sumber nama Mekanik dan Cabang
   - Perbaiki fungsi backend `get_spk_load_names` karena saat dicek fungsi ini gagal membaca kolom `email` pada `profiles` yang memang tidak ada.
   - Hasilnya: kartu Mechanic Load dan Branch Load tidak lagi jatuh ke fallback “Mekanik tidak dikenal” / “Cabang tidak dikenal”.
   - Nama cabang akan diambil dari tabel cabang yang benar; nama user akan diambil dari `profiles.full_name`.

2. Sinkronkan hitungan dashboard dengan data SPK aktif
   - Dashboard utama SPK akan membaca `spk_orders` dengan filter `deleted_at is null`, supaya SPK yang sudah dihapus tidak ikut dihitung.
   - Hitungan KPI seperti Active SPK, Completed Today, SLA, Mechanic Load, dan Branch Load akan berasal dari data SPK yang sama.

3. Rapikan definisi status sesuai flow SPK saat ini
   - Hapus label lama yang masih menyebut QC di dashboard, karena role QC sudah dihapus dari scope.
   - Status lama seperti `qc_pending` tetap ditangani aman sebagai data historis, tetapi UI akan diberi label mekanik/final check agar tidak membingungkan.

4. Perbaiki logika Mechanic Load
   - Jangan menganggap semua `current_owner_user_id` sebagai mekanik, karena data yang dicek menunjukkan banyak SPK dibuat/dimiliki oleh admin/admin cabang/staff.
   - Mechanic Load akan memprioritaskan nama mekanik dari data SPK (`data.mechanic_name` / id mekanik jika tersedia), lalu fallback ke owner hanya jika role owner benar-benar mekanik.
   - Jika SPK belum punya mekanik, tampilkan sebagai “Belum ditugaskan” agar dashboard tetap akurat.

5. Perbaiki Branch Load
   - Branch Load akan dihitung dari `spk_orders.branch_id` dan di-resolve ke `branches.name`.
   - Jika ada fallback dari snapshot SPK, tetap digunakan hanya sebagai cadangan, bukan sumber utama.

6. Samakan dengan daftar All SPK
   - `SPKAllList` juga akan memakai sumber nama cabang/mekanik yang sama agar kartu daftar SPK dan dashboard menampilkan informasi konsisten.
   - Batas query akan disesuaikan agar seluruh SPK aktif yang relevan terbaca, bukan hanya sebagian daftar terbaru.

7. Validasi setelah implementasi
   - Cek ulang query backend bahwa semua branch_id SPK resolve ke nama cabang.
   - Cek ulang UI dashboard: Mechanic Load, Branch Load, Active SPK, dan All SPK menunjukkan data yang sama dan tidak menampilkan UUID / teks tidak dikenal kecuali datanya benar-benar kosong.