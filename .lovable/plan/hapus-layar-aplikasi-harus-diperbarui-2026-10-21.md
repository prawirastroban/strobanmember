# Hapus layar "Aplikasi harus diperbarui"

## Tujuan
Layar kunci "Aplikasi harus diperbarui" tidak muncul lagi di web maupun Android. Rilis berlabel "Force" di Update Center tidak lagi mengunci aplikasi.

## Yang berubah
- Layar penuh "Aplikasi harus diperbarui" di halaman dashboard, booking, dan halaman lain yang dilindungi dihapus.
- Jendela "Pembaruan Wajib" yang tidak bisa ditutup tidak muncul lagi. Kalau ada versi baru, yang tampil hanya pemberitahuan biasa yang bisa ditutup.
- Batas versi minimum (sekarang 3.0.5) tidak lagi memblokir siapa pun.
- Fitur lain, data, dan Update Center tetap sama.

## Hal penting
Aplikasi Android menyimpan tampilannya di dalam file AAB. Artinya publish di sini hanya memperbarui web. Aplikasi Android baru ikut berubah setelah diperbarui dari Google Play, termasuk perbaikan ini. Pengguna yang sekarang terkunci di Android perlu memasang AAB baru yang berisi perbaikan ini.

## Detail teknis
- `src/lib/nativeUpdate.ts`: `requiresNativeUpdate` selalu mengembalikan `false`. Ini menonaktifkan `VersionEnforcementGate` dan `ForceUpdateDialog` lewat satu aturan bersama.
- `UpdateDialogHost`: rilis force/below-minimum memakai `UpdateDialog` biasa yang bisa ditutup. Di native, tombolnya membuka Google Play.
- `VersionGate` (web): hapus modal `blocking` dan sisakan hanya banner yang bisa ditutup.
- Perbarui `nativeUpdate.test.ts` agar memeriksa bahwa aplikasi tidak pernah terkunci. Perbarui juga aturan di AGENTS.md.
