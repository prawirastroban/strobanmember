# Rilis Update Stroban ke Google Play (AAB)

## Batasan penting
- File AAB release **tidak bisa dibuat di sini**: folder `android/` dan keystore release (kunci tanda tangan) hanya ada di komputer Anda. AAB yang ditandatangani dengan kunci lain akan ditolak Play Console.
- Jadi saya hanya menaikkan versi di project. Build AAB dijalankan di komputer Anda dengan langkah di bawah. Fitur, database, endpoint, dan signing tidak diubah.

## Yang saya ubah
- `src/config/version.ts`:
  - `APP_VERSION`: `1.0.0` -> `1.0.1`
  - `APP_BUILD_NUMBER`: `1` -> `2`
- Script `npm run android:sync` yang sudah ada otomatis menyalin nilai ini ke `versionName` / `versionCode` di `android/app/build.gradle`.
- Catatan: versionCode harus lebih besar dari rilis terakhir di Play Console. Jika rilis terakhir sudah memakai angka lebih tinggi dari 1, beri tahu saya angkanya dan saya sesuaikan.

## Langkah build di komputer Anda
```text
git pull
npm install
npm run build
npm run android:sync      # menyalin versi + aset web ke android/
npm run android:open      # buka Android Studio
```
Di Android Studio: Build > Generate Signed Bundle / APK > Android App Bundle > pilih keystore release yang sudah dipakai > variant `release`.
Hasil: `android/app/release/app-release.aab`.

Cek cepat sebelum build: `capacitor.config.ts` tidak berisi `server.url` (saat ini sudah benar).

## Upload ke Production
1. Play Console > aplikasi Stroban > Test and release > Production > Create new release.
2. Upload `app-release.aab`.
3. Isi release notes (misal: "Perbaikan dan peningkatan SPK Ban serta Pricelist").
4. Next > Save > Send for review / Start rollout to Production.
