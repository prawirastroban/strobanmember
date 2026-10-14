# Hilangkan layar loading saat kembali ke aplikasi/web

## Penyebab
Saat aplikasi dibuka kembali, sistem login memperbarui sesi secara otomatis. Pemeriksaan hak akses (staf/admin) menganggap ini login baru, mengosongkan peran, lalu menampilkan layar loading penuh sambil mengambil ulang peran — halaman Pricelist (dan dashboard) ikut ditutup sementara.

## Yang akan berubah
- Kembali ke aplikasi/web: halaman langsung tampil seperti terakhir, tanpa loading.
- Refresh / buka ulang aplikasi: peran terakhir yang diketahui dipakai langsung dari perangkat, jadi halaman muncul seketika; pengecekan ke server tetap berjalan diam-diam di belakang. Jika peran ternyata berubah (misalnya dicabut), akses langsung disesuaikan.
- Loading hanya muncul sekali saat benar-benar login pertama di perangkat tersebut.

## Detail teknis
- `useUserRole`: dependensi effect diganti dari objek `user` ke `user?.id`, sehingga TOKEN_REFRESHED tidak memicu refetch/reset. Refetch hanya saat user id berubah.
- Cache peran + cabang di localStorage `roles:v1:<userId>`; inisialisasi state dari cache (isLoading=false bila ada cache), lalu revalidasi di background dan perbarui cache. Hapus cache saat sign out.
- `AuthContext`: pastikan `loading` tidak kembali ke true setelah sesi pertama dipulihkan, dan `setUser` hanya diganti bila id berubah (hindari re-render berantai).
- `AdminRoute`/`ProtectedRoute`: tampilkan spinner hanya bila belum ada data sama sekali (bukan saat revalidasi).
- Verifikasi Playwright: buka /pricelist, simulasikan tab hidden→visible dan refresh; pastikan spinner tidak muncul dan pencarian/scroll tetap.
