## Rencana Perbaikan

1. **Redirect setelah approve**
   - Setelah customer klik **Approve & Tanda Tangan**, arahkan ke halaman status mobil yang valid: `/service/progress/:bookingId`.
   - Tambahkan fallback aman ke `/my-booking/:bookingId` bila status booking belum masuk proses, bukan ke route kosong `/my-booking`.

2. **Tampilkan card “Lihat SPK” di halaman status mobil**
   - Tambahkan `CustomerSPKCard` ke halaman `/service/progress/:bookingId` supaya customer tetap melihat SPK setelah approve.
   - Card akan menampilkan nomor SPK, status terbaru, badge tanda tangan, hasil AI health jika ada, dan tombol/card **Lihat SPK** ke PDF/print view.

3. **Sinkronkan status SPK setelah approval**
   - Perbaiki proses approve agar setelah RPC berhasil, halaman melakukan verifikasi ulang status SPK dari database.
   - Jika masih `awaiting_customer_approval`, tampilkan error/toast dan jangan redirect sebagai sukses.
   - Jika sukses berubah ke `qc_pending`, tampilkan sukses dan redirect ke status mobil.

4. **Pastikan admin/mekanik bisa lanjut proses SPK**
   - Pastikan status `qc_pending` hasil approval tetap sesuai workflow yang sudah ada, sehingga action QC/penyelesaian muncul di canvas untuk role terkait.
   - Tidak mengubah desain workflow besar; hanya memperkuat transisi customer approval.

5. **Verifikasi**
   - Cek route `/service/progress/:bookingId` dan `/my-booking/:bookingId` tidak lagi 404.
   - Cek card SPK muncul setelah approve.
   - Cek status SPK berubah dari `awaiting_customer_approval` ke `qc_pending` sehingga proses penyelesaian bisa dilanjutkan.