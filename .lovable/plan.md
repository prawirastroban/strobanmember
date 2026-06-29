Masalah utamanya kemungkinan bukan lagi di halaman callback web saja, tetapi di kontrak deep link Android: app harus punya intent-filter yang cocok, callback harus mengirim URL yang bisa ditangkap Android, dan app harus menyelesaikan sesi dari URL itu saat dibuka kembali.

Rencana perbaikan:

1. Perkuat skema deep link native
   - Standarkan callback ke format path-based yang lebih kompatibel dengan Android intent filter: `com.bengkelstroban.app://auth/callback`.
   - Tetap dukung format lama `com.bengkelstroban.app://auth-callback` agar build lama tidak langsung rusak.
   - Update normalisasi URL di `NativeAuthBridge` supaya membaca kedua format tersebut.

2. Tambahkan fallback Android App Links HTTPS
   - Tambahkan callback alternatif `https://www.bengkelstroban.com/auth/native-callback` yang dapat dibuka sebagai Android App Link.
   - Daftarkan route React untuk `/auth/native-callback` ke handler yang sama.
   - Ini memberi jalur balik tambahan jika Chrome menolak custom scheme / intent.

3. Ubah urutan auto-return di `AuthCallback`
   - Setelah sesi Google valid, callback web akan mencoba beberapa jalur secara bertahap:
     1. Android intent URL dengan package `com.bengkelstroban.app`
     2. custom scheme baru `com.bengkelstroban.app://auth/callback`
     3. legacy scheme `com.bengkelstroban.app://auth-callback`
     4. HTTPS App Link `/auth/native-callback`
   - Tombol “Kembali ke Aplikasi Stroban” akan menunjuk ke Android intent terlebih dahulu, bukan hanya scheme biasa.

4. Simpan token callback secara lebih aman di URL
   - Gunakan hash fragment untuk token (`#access_token=...&refresh_token=...`) saat memungkinkan agar tidak menjadi query URL biasa.
   - `NativeAuthBridge` sudah membaca query dan hash; akan disesuaikan agar kompatibel penuh.

5. Perbarui panduan Android build yang wajib dilakukan
   - Update `ANDROID_BUILD.md` dengan intent-filter yang benar untuk:
     - custom scheme `com.bengkelstroban.app://auth/callback`
     - legacy `com.bengkelstroban.app://auth-callback`
     - optional HTTPS App Link `https://www.bengkelstroban.com/auth/native-callback`
   - Jelaskan bahwa tanpa update `AndroidManifest.xml` + rebuild APK/AAB, auto-return dan tombol kembali tidak akan bisa bekerja walaupun kode web sudah benar.

6. Verifikasi kode
   - Jalankan TypeScript check setelah perubahan.
   - Pastikan route baru tidak mengganggu login web/PWA biasa.

Catatan penting: karena folder `/android` tidak ada di repo, saya tidak bisa langsung mengubah `AndroidManifest.xml` di sini. Saya akan memperbaiki kode web/native bridge dan dokumentasi manifest. Setelah itu APK/AAB harus dibuild ulang dengan manifest intent-filter terbaru supaya benar-benar bekerja di aplikasi Android terinstal.