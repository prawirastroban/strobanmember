# Hilangkan jendela update di Android (Play Store) tanpa AAB baru

## Penyebab
Aplikasi di HP (v3.0.6, build #282) masih memakai cara cek versi yang lama. Cara lama itu membaca rilis terbaru di server. Kalau rilis tidak punya nomor build, aplikasi memakai nomor cadangan berbentuk tanggal, misalnya 202610210300. Angka ini jauh lebih besar dari #282, jadi aplikasi selalu mengira ada versi baru.

Perbaikan sebelumnya mengosongkan nomor build di rilis, sehingga aplikasi tetap jatuh ke nomor cadangan itu. Itu sebabnya jendela update masih muncul.

## Perbaikan
1. **Data server (langsung berlaku di HP yang sudah terpasang):** catat rilis terbaru **3.0.6 dengan build 282**. Statusnya terbit, tipenya Optional, dan tanggalnya sekarang. Jadi versi di server sama persis dengan versi di HP, dan aplikasi lama menganggap tidak ada update.
2. **Kode (untuk AAB berikutnya):** rilis tanpa nomor build tidak lagi diganti dengan nomor cadangan berbentuk tanggal. Artinya rilis tanpa nomor build tidak pernah dihitung sebagai versi baru.
3. **Aturan rilis ke depan:** setiap kali upload AAB baru ke Play Store, isi form Rilis di System Management dengan versi dan nomor build yang sama dengan AAB itu. Kolom nomor build wajib diisi untuk rilis Android.

## Hasil
Setelah aplikasi ditutup penuh lalu dibuka lagi, HP dengan v3.0.6 dari Play Store tidak lagi menampilkan jendela atau banner update. Force Refresh tetap bisa dipakai dan tidak memunculkan jendela update.

## Detail teknis
- Akar masalah: `getVersionRegistry` pada build lama mengembalikan `APP_BUILD_NUMBER` (timestamp Vite 12 digit) saat `build_number` null. `computeUpdateAvailable` lalu menilai `serverBuild > info.build (282)` sebagai benar.
- Insert data: tambah baris `app_releases` dengan `{version:"3.0.6", build_number:282, status:"published", deployment_type:"optional", force_update:false, release_channel:"production", released_at: now()}`. Baris ini menjadi rilis terbit terbaru.
- `src/services/versionRegistry.ts`: `buildNumber` bernilai `null` (bukan `APP_BUILD_NUMBER`) jika kolomnya kosong atau ≤ 0. Sesuaikan tipe dan pemakainya (`versionCheck.ts` sudah menangani null).
- `AppVersionManager`: nomor build wajib diisi (integer 1–100000) sebelum rilis disimpan.
- Verifikasi: query ulang rilis terbaru, lalu jalankan simulasi Playwright dengan kode cek versi lama (`git show 3082c576`) memakai versi lokal 3.0.6/#282 untuk memastikan `isUpdateAvailable=false`. Jalankan juga `nativeUpdate.test.ts` dan tambah test untuk build null.
