## Hapus Horizontal Nav Links dari Navbar

Tujuan: Membersihkan tampilan navbar dengan menghilangkan menu horizontal "Beranda / Katalog / Promo / Cabang" di desktop.

### Perubahan
1. **`src/components/Navbar.tsx`** — Hapus blok `<div className="hidden md:flex ...">` yang berisi horizontal nav links (baris sekitar 247–280).

### Alasan aman
- Navigasi desktop tetap tersedia melalui `DesktopSidebar` (ikon hamburger di kiri) yang sudah berisi link Beranda, Katalog, Layanan, dan Cabang.
- Navigasi mobile tetap tersedia melalui `MobileNav` / `BottomNav`.

Tidak ada perubahan fungsional — hanya penyederhanaan UI.
