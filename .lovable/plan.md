# Blueprint Update — Audit Duplikat & Status Fitur

## Riwayat Konsolidasi
- **ServiceReminder (mock)** dihapus → digantikan `UpcomingBookings` (preview) + page `/reminder-service` (full).
- **Tombol "Status" di navbar kanan** dihapus → digabung dengan icon mobil di pojok kiri navbar.
- **Tombol "Kembali ke Riwayat" lokal** di MyBooking, BookingStatus, ServiceCompleted, ServiceProgress dihapus → pakai back button navbar.
- **Tombol "Lihat Riwayat Lengkap" mobile** di ReminderService dihapus (duplikat shortcut header).
- **Promo tab** di BottomNav diganti **Keranjang** → `/checkout-coming-soon`.
- **UpcomingBookings, LoyaltyPoints, RewardsStore** dihapus dari dashboard `/` → dipindah ke tab Pesanan (`/reminder-service`) & page baru `/loyalty`.
- **Tab Keranjang** di BottomNav diganti **Loyalitas** (`/loyalty`) — keranjang masih placeholder, dialihkan sementara.

## Audit Duplikat Aktif (per 2026-04-22)
| Area | Status |
|---|---|
| Reminder Service | ✅ Tunggal (UpcomingBookings dashboard + /reminder-service page) |
| Riwayat Servis | ✅ Tunggal (/profile/history-perawatan) |
| Status Booking | ✅ Tunggal (icon mobil navbar → /my-booking/:id) |
| Back navigation | ✅ Tunggal (navbar back button) |
| Loyalitas & Hadiah | ✅ Tunggal (/loyalty page, shortcut di Profile + BottomNav) |
| Dashboard `/` | ✅ Hanya Service catalog + ServiceHistory widget (mock) |

## Fitur / Tombol yang BELUM Berfungsi Penuh
| Lokasi | Elemen | Status | Saran |
|---|---|---|---|
| `BottomNav` | Tab "Keranjang" | Mengarah ke placeholder `/checkout-coming-soon` | Implementasi cart real (tire + service items) |
| `CheckoutComingSoon.tsx` | Seluruh page | Placeholder, hanya log activity | Buat real checkout flow dengan Midtrans |
| `staff/MarketingDashboard.tsx` | Konten tab | Hardcoded "Coming Soon" | Implementasi promo manager, broadcast WA/email |
| `ServiceHistory.tsx` (komponen dashboard) | Data | Hardcoded mock array (3 entries) | Sambungkan ke tabel `bookings` status=completed |
| `MobileServiceList`, `QuickCategoryGrid` | Beberapa kategori (Detailing, Body Care, Aki & Listrik) | Klik mungkin tidak filter ke service nyata | Verifikasi mapping kategori → service catalog |
| `PromoCarousel` (mobile) | 3 slide promo | Hardcoded statis | Sambungkan ke tabel promo/marketing |
| `Navbar` | Pesan toast "Belum ada pesanan aktif" | OK fungsional | — |

## Komponen Mock-Data yang Masih Aktif
- `src/components/ServiceHistory.tsx` (dashboard widget) — array hardcoded
- `src/components/mobile/PromoCarousel.tsx` — slide hardcoded
- `src/components/mobile/MobileBranchPicker.tsx` — branch list hardcoded (acceptable, jarang berubah)

## Halaman yang Sudah Real-data + Realtime
- `/` (dashboard authenticated): UpcomingBookings, LoyaltyPoints, RewardsStore
- `/reminder-service`: bookings + vehicles (Supabase realtime)
- `/my-booking/:id`, `/service/progress/:id`, `/service/completed/:id`: realtime status
- `/profile/history-perawatan`: query bookings completed
- `/my-vehicles`, `/vehicle/:id`: CRUD penuh
- `/profile`: avatar upload + profile update
- `/dashboard/*`: admin/staff panels

## Rekomendasi Iterasi Berikutnya
1. **Implementasi Cart/Keranjang** (tertinggi prioritas — sudah ada tab tapi placeholder).
2. **Sambungkan `ServiceHistory` widget** ke real bookings completed.
3. **Marketing Dashboard** — bangun tools promo, broadcast.
4. **Promo Carousel mobile** — buat tabel `promos` + admin manager.
