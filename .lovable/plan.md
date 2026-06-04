## Fase 1 — Card Style Konsisten (Global Token + Base Component)

Hanya menyentuh design token + komponen `<Card>` shadcn. Semua card yang sudah pakai `<Card>` (mayoritas halaman) otomatis ikut berubah. Tidak menyentuh komponen mobile custom (itu Fase 2 terpisah, perlu approval baru).

### Perubahan file

**1. `src/components/ui/card.tsx`**
- Update class default `<Card>`:
  - Sebelum: `rounded-lg border bg-card text-card-foreground shadow-sm`
  - Sesudah: `rounded-2xl border border-border/70 bg-card text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]`
- Tidak mengubah signature/props — hanya className default.

**2. `src/index.css`**
- Pastikan `--radius` = `0.875rem` (jika sudah berbeda, tidak diutak-atik agar tidak merusak komponen lain seperti button/input).
- Tambahkan utility class baru `.card-surface` untuk dipakai komponen non-`<Card>` di Fase 2 nanti:
  ```css
  .card-surface {
    @apply rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)];
  }
  ```

**3. `tailwind.config.ts`**
- Tidak diubah (token border & card sudah ada).

### Yang TIDAK disentuh (tetap utuh sampai Fase 2 di-approve)
- Hero edge-to-edge.
- Komponen mobile custom (`mobile/home/*`, `MobileBookingCard`, `PromoCarousel`, dll.) yang tidak pakai `<Card>` shadcn.
- Card glassmorphism dengan red neon glow.
- Tire carousel.

### Verifikasi
- Visual check mobile 390×844 di: `/`, `/dashboard`, `/my-booking`, `/profile`, `/loyalty`, `/promo`, `/katalog`.
- Visual check desktop 1370×900 di `/dashboard`.
- Tidak ada perubahan fungsional, tidak ada call backend, tidak ada migrasi DB.

### Rollback
Revert 1 commit (2 file). Tanpa side-effect data.
