# Hilangkan jendela update di aplikasi Android dari Play Store

## Penyebab
Aplikasi Android menyimpan tampilannya di dalam file AAB. Versi di HP (v3.0.6, build #282) dibuat sebelum pemberitahuan update dimatikan, jadi masih memakai cara cek yang lama. Cara lama ini membaca data rilis di server. Rilis yang tercatat di sana punya nomor build #20261508, angka berbentuk tanggal yang jauh lebih besar dari #282. Akibatnya aplikasi mengira masih ada versi yang lebih baru, padahal tidak ada.

## Perbaikan (tanpa perlu AAB baru)
Perbaikannya cukup di data server, karena aplikasi lama tetap membaca data itu:
1. Hapus nomor build berbentuk tanggal (20261508, 20261020) dari rilis 3.0.3–3.0.5 yang sudah tercatat. Rilis lama itu juga ditandai arsip agar tidak dihitung sebagai versi terbaru.
2. Ubah versi terbaru dan versi minimum di pengaturan server ke 3.0.6. Matikan juga tanda "force refresh" lama.
3. Supaya tidak terulang, form Rilis di System Management mengisi nomor build sesuai versionCode Android, bukan tanggal. Nomor build juga tidak boleh lebih kecil dari versi yang sudah terpasang.

## Hasil
Setelah aplikasi dibuka ulang, HP dengan v3.0.6 dari Play Store tidak lagi menampilkan "Aplikasi telah diperbarui / Update Sekarang", dan tidak ada AAB baru yang perlu diunggah. Web tetap tanpa banner.

## Detail teknis
- Migrasi data: `app_releases` set `build_number = null`, `status='archived'` untuk versi ≤ 3.0.5; upsert `app_settings` `app_version` = `{version:"3.0.6", force_refresh:false, deployment_type:"optional"}`, `app_min_version` = `{version:"1.0.0"}`.
- Cek kode lama `computeUpdateAvailable`: versi/build server yang kosong atau lebih rendah berarti tidak ada update.
- `AppVersionManager`: build default diisi dari `APP_BUILD_NUMBER` (versionCode). Rilis ditolak jika build berupa tanggal (> 100000).
- Cara cek: query ulang data, lalu jalankan simulasi native di Playwright dengan versi lokal 3.0.6/#282 untuk memastikan jendela tidak muncul.
