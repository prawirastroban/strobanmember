## Tujuan

Setiap SPK terhubung ke akun pelanggan dan data kendaraannya. Jika pelanggan belum punya akun, sistem menyiapkan akun bayangan + kendaraan dari data SPK, lalu admin membagikan link aktivasi. Begitu pelanggan klaim akun, kendaraan dan riwayat SPK-nya langsung ada di akun tersebut.

## Alur yang dibangun

```text
/spk/new
 ├─ Sumber: Booking  → customer_id & vehicle_id ikut dari booking (sudah jalan)
 ├─ Sumber: Pelanggan → admin pilih pelanggan dari daftar, lalu pilih
 │                      salah satu kendaraan miliknya (BARU)
 └─ Sumber: Manual   → [x] Buatkan akun pelanggan & simpan kendaraan
                        → akun bayangan + kendaraan dibuat, SPK ditautkan
                        → tombol "Terbitkan link aktivasi" di kartu Bagikan
```

Setelah pelanggan klaim akun di `/claim/:token`, tidak perlu migrasi data apa pun: kendaraan dan SPK sudah memakai `user_id` yang sama, sehingga otomatis muncul di **Kendaraan Saya** dan riwayat SPK-nya.

## Yang akan dikerjakan

**1. Pemilihan kendaraan saat sumber "Pelanggan"** (`src/pages/spk/SPKNewForm.tsx`)
- Setelah admin memilih pelanggan, tampilkan daftar kendaraan milik akun tersebut; memilih satu akan mengisi merk/tipe/tahun/plat dan menetapkan `vehicle_id`.
- Jika pelanggan belum punya kendaraan, admin isi manual dan kendaraan disimpan ke akun itu (checkbox "Simpan kendaraan ke akun pelanggan", default aktif).

**2. Blok "Akun Pelanggan" untuk sumber Manual** (`SPKNewForm.tsx`)
- Checkbox **"Buatkan akun pelanggan & simpan data kendaraan"** — default aktif, bisa dimatikan.
- Saat disimpan (dan checkbox aktif): panggil `admin-user-ops` aksi `create_customer` (nama + nomor WA; jika nomor sudah terdaftar akun lama dipakai ulang, bukan duplikat), lalu `add_vehicle` (merk, tipe, tahun, plat). Hasilnya dipakai sebagai `customer_id` dan `vehicle_id` pada SPK.
- Kegagalan pembuatan akun tidak membatalkan SPK: SPK tetap dibuat, muncul peringatan bahwa penautan akun gagal dan bisa diulang dari daftar SPK.
- Dialog review sebelum simpan menampilkan ringkasan: akan dibuatkan akun baru / ditautkan ke akun yang ada / tidak ditautkan.

**3. Penautan susulan dari daftar SPK** (`src/components/spk/SPKShareCard.tsx`)
- Bila SPK belum punya `customer_id`, tampilkan tombol **"Tautkan & buatkan akun pelanggan"** yang menjalankan proses yang sama dari data SPK, lalu langsung menerbitkan link aktivasi.
- Bila sudah punya akun, perilaku sekarang dipertahankan (terbitkan link aktivasi / bagikan link tracking).

**4. Backend pendukung**
- Aksi `add_vehicle` saat ini menolak plat yang sudah terdaftar (409). Akan ditambahkan opsi "pakai kendaraan yang sudah ada" sehingga bila plat cocok dan pemiliknya sama, kendaraan itu dipakai ulang, bukan error. Bila plat milik pelanggan lain, tetap ditolak dan admin diberi tahu.
- Tidak ada perubahan skema database; kolom `spk_orders.customer_id` dan `vehicle_id` sudah tersedia.

**5. Sisi pelanggan setelah klaim**
- Halaman klaim akun dibiarkan seperti sekarang. Setelah login, kendaraan otomatis tampil di Kendaraan Saya, dan SPK terkait tampil di riwayat pelanggan — akan diverifikasi bahwa daftar SPK pelanggan membaca `customer_id` (bukan hanya lewat booking), dan disesuaikan bila ternyata hanya lewat booking.

## Catatan teknis

- Nomor WA dinormalkan (`+62…`) sebelum pembuatan akun agar pelanggan lama terdeteksi dan tidak terjadi akun ganda.
- Plat selalu disimpan huruf kapital agar pencocokan konsisten.
- Aturan keamanan tetap: pembuatan akun/kendaraan hanya lewat edge function `admin-user-ops` dengan pengecekan peran admin/staff.
