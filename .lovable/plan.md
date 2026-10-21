# Hilangkan banner update + sederhanakan System Management

## Tujuan
- Pengguna tidak lagi melihat banner/jendela "Versi baru tersedia" atau arahan ke Google Play, karena aplikasi sudah versi terbaru.
- System Management lebih singkat dan mudah dipakai.

## Yang berubah
1. **Pemberitahuan update dimatikan** di web dan Android: banner "Versi baru tersedia", jendela pembaruan, dan toast "Lihat" tidak muncul lagi. Aplikasi tetap otomatis memakai versi web terbaru setelah Publish.
2. **Arahan ke Google Play dihapus** dari pemberitahuan update. Banner "Pasang aplikasi" di browser HP tetap ada (hanya untuk yang belum memasang) kecuali Anda minta dihapus juga.
3. **Force Refresh tetap jalan**: admin masih bisa memuat ulang aplikasi semua pengguna dengan satu tombol.
4. **System Management dirapikan** dari 6 tab menjadi 3:
   - **Ringkasan**: status sistem + tombol utama "Force Refresh semua pengguna" + Mode Maintenance.
   - **Rilis**: catat versi & catatan rilis (satu form singkat), dengan riwayat di bawahnya.
   - **Lanjutan** (dilipat): Cache, Sesi pengguna, Audit notifikasi, Audit sistem, Play Store checklist, PWA & Install.
   Link lama (?tab=...) tetap diarahkan ke tab baru.

## Detail teknis
- `App.tsx`: lepas `UpdateDialogHost`, `UpdateAvailableToast`, `VersionGate` dari root (komponen dibiarkan, tidak dirender). `VersionEnforcementGate` tetap pass-through.
- `SystemManagementHub.tsx`: susun ulang ke 3 tab; panel Lanjutan dalam Accordion; perbarui `LEGACY_TAB_MAP`.
- `AppVersionManager` tetap dipakai di tab Rilis; `ReleaseNotesManager` + `DeploymentHistoryPanel` digabung di bawahnya.
- Perbarui AGENTS.md (aturan update: tidak ada pemberitahuan update otomatis) dan test `nativeUpdate.test.ts` tetap lulus; cek tampilan via Playwright.
