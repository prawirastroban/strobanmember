# Hapus Force Update, sisakan Force Refresh + tombol tutup

## Tujuan
- System Management tidak lagi punya pilihan "Force" untuk rilis. Yang tersisa hanya **Force Refresh** (memuat ulang semua pengguna agar dapat versi web terbaru).
- Jendela "Pembaruan Wajib" seperti di gambar Anda punya tombol tutup (X) dan tombol "Nanti".

## Yang berubah
1. **Update Center / Deployment**: pilihan jenis rilis "Force" dihapus. Hanya "Recommended" dan "Optional". Rilis baru tidak pernah menandai wajib update.
2. **Data rilis sekarang dibersihkan**: rilis 3.0.5 yang berlabel Force diubah jadi Recommended, dan batas versi minimum (3.0.5) dikosongkan. Ini penting: aplikasi Android lama di HP pengguna membaca data ini, jadi **layar terkunci di HP langsung hilang tanpa menunggu AAB baru**.
3. **Jendela pembaruan**: ditambah tombol X di pojok kanan atas dan tombol "Nanti", label "FORCE" dan teks "harus diperbarui" diganti "Versi baru tersedia".
4. **Force Refresh Center** tetap ada; saat dikirim tidak lagi menaikkan versi minimum, hanya memuat ulang aplikasi semua pengguna.

## Detail teknis
- `AppVersionManager.tsx`: hapus opsi `force` dari pilihan deployment; simpan selalu `force_update: false`, `force_refresh` hanya dari toggle refresh.
- Migrasi data: `update app_releases set deployment_type='recommended', force_update=false where deployment_type='force' or force_update`; set `app_settings.app_min_version` ke `{version:"0.0.0"}`; `app_settings.app_version.deployment_type` -> recommended.
- `ForceRefreshCenter.tsx`: jangan ubah `app_min_version`; tetap tulis log/riwayat dan sinyal refresh.
- `ForceUpdateDialog.tsx` / `UpdateDialog.tsx`: dialog bisa ditutup (onOpenChange, tombol X, "Nanti"), hapus badge FORCE.
- Uji: test `nativeUpdate.test.ts` tetap lulus; cek tampilan tab deployment via Playwright.
