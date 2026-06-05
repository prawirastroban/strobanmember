# Plan: Tombol Install App di MobileNav (Sidebar HP)

Tombol install sebelumnya hanya ditambahkan di `DesktopSidebar.tsx`. Sidebar yang Anda lihat di mobile sebenarnya adalah komponen berbeda: **`src/components/MobileNav.tsx`**. Itu sebabnya tombolnya tidak muncul.

## Perubahan
Edit **`src/components/MobileNav.tsx`** saja:

1. Import `useInstallPrompt` (hook yang sudah dibuat sebelumnya), `Download`, `Share`, `Plus` dari lucide, dan `toast` dari sonner.
2. Tambah state `installGuideOpen` + handler `handleInstallClick` (sama logic dengan DesktopSidebar).
3. Tambah section **"Aplikasi"** dengan tombol **"Install App"** setelah section "Bantuan", di **kedua cabang** (logged-in dan guest), agar konsisten.
4. Tambah `<Dialog>` panduan iOS/Android/Desktop di akhir component (reuse markup yang sama persis dengan DesktopSidebar).
5. Visibility: hanya tampil jika `show === true` (belum ter-install & bukan Capacitor native).

## Tidak Diubah
- Tidak ubah BottomNav, Navbar, booking, payment, auth.
- Tidak ubah hook `useInstallPrompt` (sudah ada).

## Risiko
Sangat rendah — murni tambahan UI di satu file.

Setujui?
