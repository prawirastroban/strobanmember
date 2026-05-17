## Ganti Logo Stroban (Merah)

Mengganti logo fallback dengan logo STROBAN merah baru yang Anda upload.

### Perubahan
1. Copy `user-uploads://image-113.png` → `src/assets/stroban_red.png`.
2. Update `src/hooks/useBranding.ts`: import `stroban_red.png` sebagai `FALLBACK_LOGO` (mengganti `stroban_white.png`).
3. Update `src/components/Footer.tsx`: karena logo baru sudah berwarna merah, kembalikan ke `<img src={logoDark} />` biasa (hapus trik mask + `backgroundColor`), tetap pertahankan `drop-shadow` neon halus agar terlihat di footer gelap.
4. (Opsional) Hapus `src/assets/stroban_white.png` jika tidak dipakai lagi — saya akan cek dulu referensi sebelum hapus.

### Catatan
Logo yang tersimpan di database (`app_branding.logo_dark_url`) akan tetap menimpa fallback. Jika Anda ingin logo merah ini juga jadi logo aktif di DB, beri tahu — saya bisa upload ke storage & update `app_branding`. Default plan ini hanya mengganti aset fallback di kode.