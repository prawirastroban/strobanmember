## Rencana Perbaikan

Saya akan memastikan flow approval SPK benar-benar terlihat dari sisi user dan tidak tersembunyi di bawah halaman.

### 1. Perbaiki halaman approval `/spk/:id/approve`
- Buat area **Tanda Tangan Digital** lebih menonjol dan langsung terlihat.
- Tambahkan tombol utama yang jelas: **Approve & Tanda Tangan**.
- Buat tombol approve tetap mudah ditemukan di mobile dengan action bar sticky di bawah layar.
- Tampilkan pesan jelas jika tanda tangan belum diisi, bukan hanya tombol disabled.

### 2. Pastikan status yang diklik mengarah ke approval
- Perbaiki tombol **Status / Approve SPK** di navbar agar tidak hanya mengecek 1 booking aktif terakhir.
- Cari semua SPK milik user yang statusnya `awaiting_customer_approval`, sehingga tombol tetap muncul walaupun booking aktif bukan yang terbaru.
- Saat user klik status yang dilingkari, arahkan langsung ke halaman approval SPK yang benar.

### 3. Tambahkan akses approval dari kartu SPK user
- Di kartu SPK pada halaman booking user, tampilkan CTA eksplisit **Approve SPK** saat butuh approval.
- Jangan hanya jadikan seluruh card sebagai link, karena tombol bisa tidak terasa terlihat oleh user.

### 4. Verifikasi setelah implementasi
- Jalankan pengecekan tipe/build yang relevan.
- Verifikasi secara visual bahwa halaman approval berisi:
  - form tanda tangan digital,
  - tombol approve,
  - tombol revisi,
  - dan action bar mobile yang terlihat.