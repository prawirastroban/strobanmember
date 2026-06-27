Rencana perbaikan flow login Google Android:

1. **Perkuat URL balik dari browser ke aplikasi**
   - Ubah callback sukses login agar mencoba Android `intent://` URL lebih dulu, bukan hanya custom scheme `com.bengkelstroban.app://...`.
   - Tetap simpan fallback custom scheme dan tombol manual jika Android/Chrome menolak auto-open.

2. **Buat token login lebih aman dan konsisten dikirim ke app**
   - Callback web akan membangun return URL dengan `access_token`, `refresh_token`, dan `state` secara deterministik.
   - App akan membaca token dari deep link, validasi `state`, lalu langsung set session dan navigasi ke halaman tujuan.

3. **Perbaiki handler app saat dibuka kembali**
   - `NativeAuthBridge` akan menerima baik format `intent://...` maupun `com.bengkelstroban.app://auth-callback`.
   - Setelah session sukses dibuat, browser Custom Tab ditutup dan app diarahkan ke halaman terakhir/user home tanpa stuck di layar “Login berhasil”.

4. **Tambahkan guard anti-stuck**
   - Jika auto-return gagal setelah beberapa percobaan, tombol “Kembali ke Aplikasi Stroban” tetap tersedia sebagai fallback.
   - Pesan error dibuat jelas jika token tidak diterima atau state tidak cocok.

5. **Catatan penting native Android**
   - Agar benar-benar auto-open dari Chrome, APK/AAB harus punya intent filter untuk scheme `com.bengkelstroban.app` host `auth-callback`.
   - Karena folder native `android/` tidak ada di source ini, setelah perubahan web diterapkan Anda perlu `git pull`, lalu jalankan `npm run build` dan `npx cap sync android`. Jika project Android native ada di repo/build machine terpisah, intent filter-nya juga harus dipastikan ada di `AndroidManifest.xml`.