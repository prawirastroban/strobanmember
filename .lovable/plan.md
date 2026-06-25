Audit menyeluruh tampilan mobile, fokus pada masalah yang muncul di screenshot sebelumnya (tumpang tindih, safe-area, overflow).

## Cakupan audit

Menjalankan Playwright headless pada viewport mobile (375x812 dan 414x896) untuk setiap halaman utama, lalu menangkap screenshot dan memeriksa:

1. **Safe-area & Navbar**
   - Halaman: `/`, `/katalog`, `/promo`, `/cabang`, `/profile`, `/booking`, `/loyalty`, `/notifications`, `/my-vehicles`, `/dashboard`.
   - Pastikan tidak ada konten yang menabrak status bar/notch.
   - Pastikan spacer navbar (`calc(3.5rem + safe-area-inset-top)`) bekerja konsisten.

2. **Overlay & Floating Elements**
   - Toast (Sonner + Radix) — tidak menabrak navbar/header.
   - `CookieConsentBanner`, `WhatsAppRequiredGate`, `PromoPopupDialog` — antrian overlay benar.
   - `FloatingCartPill`, `WhatsAppButton`, `ChatWidget` — tidak menutupi BottomNav.
   - `BottomNav` (h-16) — pastikan tiap halaman punya padding-bottom cukup.

3. **Komponen Hero & Home Mobile**
   - `MobileHero`, `HeroBookingForm`, `ServiceCategoryGrid`, `PopularServices`, `VoucherClaimCard`, `BottomCTA`, `TrustStrip`.
   - Periksa overflow horizontal, padding antar section, teks ter-clamp dengan benar.

4. **Halaman utama lainnya**
   - `Katalog`: filter sticky + grid.
   - `Promo`: card promo & CTA.
   - `Cabang`: list cabang + peta.
   - `Profile` & `Loyalty`: header & card.
   - `Booking` wizard: stepper, form, sticky bottom action bar.
   - `NotificationCenter`: list item, action.
   - `MyBooking` / `ServiceProgress`: progress tracker.

5. **Dashboard mobile (staff/admin)**
   - Sidebar drawer, header h-9, tab navigation, KPI cards.

## Output

- Daftar temuan terstruktur (halaman → masalah → penyebab → perbaikan).
- Setelah daftar disetujui, lanjut implementasi perbaikan dalam batch kecil per area: navbar/safe-area, overlay/floating, layout per halaman.

## Detail teknis

- Gunakan Playwright dari `/tmp/browser/mobile-audit/` dengan loop viewport mobile.
- Inject `LOVABLE_BROWSER_SUPABASE_*` session bila perlu mengakses halaman terproteksi.
- Screenshot disimpan per route untuk perbandingan.
- Tidak mengubah business logic; hanya CSS/layout/komponen presentasi.
