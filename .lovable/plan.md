## Plan Perbaikan CRUD Akun

### Tujuan
Menstabilkan semua aksi pengaturan akun yang sekarang sering error: tambah customer di Quick Booking, edit data user, ubah role, reset password, verifikasi, hapus akun, dan tambah kendaraan.

### Temuan utama
- Beberapa tabel inti akun belum punya akses eksplisit untuk backend API, sehingga operasi bisa gagal walaupun aturan akses sudah ada.
- Sebagian UI masih melakukan mutasi langsung ke tabel `profiles` / `vehicles`, yang rentan gagal untuk admin cabang atau staff karena aturan akses.
- Aksi fungsi admin sudah ada, tetapi belum mencakup semua kebutuhan seperti update profil dan tambah kendaraan secara konsisten.
- Role `mekanik` sudah ada di hook role, tetapi belum konsisten di layar manajemen role/customer.

### Perubahan yang akan dilakukan
1. **Stabilkan izin backend akun**
   - Beri akses eksplisit untuk tabel akun/kendaraan/booking/notifikasi/reset/audit yang dipakai oleh modul customer management.
   - Tetap pertahankan RLS sebagai pembatas data; perubahan ini hanya membuka jalur API agar aturan yang ada bisa berjalan.

2. **Pusatkan semua operasi admin ke fungsi admin akun**
   - Tambahkan action `update_profile` untuk edit nama, nomor WA, status verifikasi WA, dan cabang penempatan.
   - Tambahkan action `add_vehicle` untuk tambah kendaraan customer dengan validasi plat duplikat.
   - Perluas `set_role` agar menerima role `mekanik`.

3. **Samakan pemanggilan fungsi admin dari frontend**
   - Buat helper pemanggilan fungsi admin dengan token login aktif, agar error JSON dari backend terbaca jelas dan tidak berubah menjadi pesan umum `Failed to fetch`.
   - Terapkan helper ini di:
     - Quick Booking tambah customer / issue claim
     - Customer List verify / reset / delete / role
     - Edit Customer profile / email / role / verifikasi WA
     - Add Vehicle dialog
     - User Roles Manager reset / delete / role
     - User Verification

4. **Perbaiki role management agar sesuai scope terbaru**
   - Role yang tampil dan bisa dipilih: `staff`, `admin`, `admin_cabang`, `mekanik`, `customer`.
   - Untuk `admin_cabang` dan `mekanik`, cabang wajib dipilih.
   - Label tetap sederhana: Staff Owner, CS Pusat, Admin Cabang, Mekanik Cabang, Customer.

5. **Validasi alur utama**
   - Cek tidak ada lagi mutasi langsung yang rawan gagal untuk aksi admin account CRUD.
   - Jalankan pengecekan tipe/lint ringan lewat harness otomatis.
   - Pastikan pesan error yang muncul spesifik: sesi habis, role tidak berhak, nomor duplikat, plat duplikat, email dipakai, dll.

### Catatan
Saya sudah menemukan bahwa izin backend tabel inti memang kosong saat dicek, jadi perbaikan izin adalah bagian penting agar CRUD akun tidak terus gagal.