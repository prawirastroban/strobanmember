Rencana perbaikan tata letak notifikasi mobile:

1. Satukan offset notifikasi dengan safe-area Android/iOS
   - Ubah posisi toast Radix (`src/components/ui/toast.tsx`) agar top offset memakai `calc(env(safe-area-inset-top) + tinggi navbar + jarak aman)`.
   - Ini mencegah toast muncul di area status bar atau menimpa header seperti pada screenshot.

2. Perbaiki Sonner toast global
   - Ubah `src/components/ui/sonner.tsx` supaya offset mobile tidak lagi angka tetap `24`, tetapi mengikuti `env(safe-area-inset-top)` dan tinggi navbar.
   - Pertahankan posisi `top-center`, namun turunkan toast ke bawah navbar pada layar kecil/native app.

3. Tambahkan token CSS aman untuk native mobile
   - Di `src/index.css`, tambahkan variabel seperti `--app-navbar-height`, `--app-toast-top-offset`, dan fallback safe-area.
   - Gunakan media query mobile agar desktop tetap seperti sekarang.

4. Pastikan tampilan toast tidak melebar/bertumpuk
   - Batasi lebar toast mobile agar tidak menyentuh tepi layar.
   - Pastikan tombol action di dalam toast tetap muat dan tidak menabrak teks.

5. Verifikasi visual
   - Cek halaman utama dengan viewport mobile/narrow untuk memastikan toast muncul di bawah header, tidak bertabrakan dengan status bar, hero text, maupun navbar atas.