## Tujuan
Memperbaiki error `Failed to fetch` pada Quick Booking dan ubah role/customer management sampai benar-benar bisa dipakai, lalu saya verifikasi langsung lewat alur aplikasi dan request backend.

## Temuan utama
- Request yang gagal adalah `POST /functions/v1/admin-user-ops` action `create_customer` dari Quick Booking.
- Karena statusnya `Failed to fetch` tanpa response body, kemungkinan besar masalah terjadi di layer network/CORS/deployment function, bukan validasi form biasa.
- Aksi lain seperti ubah role memakai jalur function yang sama, jadi fix harus menguatkan seluruh gateway `admin-user-ops`, bukan hanya satu tombol.

## Rencana perbaikan
1. **Stabilkan gateway frontend**
   - Perkuat `invokeAdminUserOps` agar memakai fallback resmi client function invoke bila direct `fetch` gagal.
   - Tambahkan timeout dan pesan error yang jelas supaya tidak lagi hanya muncul `Failed to fetch`.
   - Pastikan semua response parsing aman meskipun backend mengembalikan non-JSON/empty body.

2. **Perkuat CORS dan response backend**
   - Audit dan rapikan `admin-user-ops` agar semua jalur return error/success menyertakan CORS header lengkap.
   - Tambahkan header preflight yang umum dipakai browser/client (`authorization`, `apikey`, `content-type`, `x-client-info`, versi API, prefer).
   - Pastikan exception global tetap mengembalikan JSON valid.

3. **Fix jalur create customer Quick Booking**
   - Pastikan `create_customer` selalu mengembalikan response cepat dan tidak menunggu pengiriman WhatsApp eksternal.
   - Tangani error `profiles.upsert`, `user_roles.upsert`, duplicate phone/email, dan audit log secara eksplisit supaya tidak meledak menjadi fetch failure.
   - Pastikan customer baru yang dibuat dari nomor HP tetap punya profile, role `customer`, verified state, dan data bisa langsung dipilih di Quick Booking.

4. **Fix jalur role/edit/reset terkait akun**
   - Pastikan `set_role`, `update_profile`, `update_email`, `reset_password`, `delete_user`, `verify_user`, `add_vehicle` memakai pola response error yang sama.
   - Pastikan role sederhana tetap konsisten: `staff`, `admin`, `admin_cabang`, `mekanik`, `customer`.
   - Untuk role cabang (`admin_cabang`, `mekanik`), validasi cabang tetap wajib dan tersimpan ke profile.

5. **Verifikasi langsung oleh saya**
   - Jalankan tes request function untuk preflight `OPTIONS` dan action aman/terkontrol agar memastikan CORS dan auth route merespons JSON, bukan fetch failure.
   - Pakai Playwright pada preview untuk membuka Quick Booking, input customer baru test, klik Save, dan cek tidak muncul toast `Failed to fetch`.
   - Verifikasi ubah role di Customer Management/User Role Manager sampai request backend sukses atau error validasi tampil sebagai pesan bisnis yang jelas.
   - Cek runtime console/network setelah fix untuk memastikan tidak ada error baru dari alur ini.

## Catatan batasan
- Saya tidak akan mengubah scope bisnis baru; fokus hanya memperbaiki CRUD akun/customer/role yang gagal.
- Jika verifikasi butuh sesi admin aktif, saya akan memakai session preview yang tersedia; bila tidak tersedia, saya tetap verifikasi level backend/CORS dan alur UI publik yang bisa diakses.