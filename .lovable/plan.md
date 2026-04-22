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

## Audit Sistem End-to-End (2026-04-22)
✅ **Fix dead-end Checkout** — onSuccess/onPending sebelumnya navigate ke `/my-booking` (tidak ada → NotFound). Sekarang ke `/profile/history-perawatan`.
✅ **Fix orphan route `/checkout-coming-soon`** — redirect ke `/checkout`.
✅ **Fix inconsistent cancel flow di BookingStatus** — sekarang pakai RPC `request_booking_cancellation` (sama dengan MyBooking, butuh approval staff).
✅ **Cart badge di BottomNav** — menampilkan jumlah item di tab Checkout.

### Status Integrasi (verified)
- Booking → Payment → Service → Invoice: tersinkron via DB triggers (`set_waiting_confirmation_on_payment`, `sync_invoice_payment_status`, `award_points_on_booking_complete`)
- Notifikasi: trigger DB aktif untuk booking, payment, loyalty, vehicle, tire_order, invoice
- Dashboard panel: semua modul terhubung dengan role guard (StaffOnly untuk inventory/marketing/keuangan)
- Realtime: bookings, payments aktif via Supabase channels (MyBooking, BookingStatus, ServiceProgress)

## Enhancement Otomatisasi (2026-04-22)
✅ **ServiceHistory widget real-data** — sekarang query `bookings` status=completed, dengan realtime subscribe per user. Auto-link booking selesai ke widget tanpa refresh.
✅ **Smart next action di history widget** — banner reminder otomatis muncul jika `next_service_date` ≤30 hari (auto-generated dari trigger DB `set_next_service_date_on_complete`). Klik → langsung ke `/booking`. CTA "Booking Lagi" inline.
✅ **AdminDashboard realtime sync** — KPI cards (revenue, pending, bookings, activity) auto-refresh saat booking/payment/activity_logs berubah. Tidak perlu manual reload.
✅ **Auto-redirect chain** — sudah berjalan: ServiceProgress → ServiceCompleted (saat completed), Checkout → history (saat sukses), MyBooking → invoice via realtime status.

### Smart Next Actions yang sudah hidup
| Konteks | Aksi otomatis |
|---|---|
| Booking unpaid | Tombol "Bayar Sekarang" di MyBooking |
| Service selesai | "Booking Lagi" + "Beri Ulasan" di ServiceCompleted |
| Riwayat dengan reminder ≤30hr | Banner urgensi di ServiceHistory widget |
| Booking baru → staff dashboard | KPI cards & activity feed update realtime |
| Customer dapat poin | Notifikasi otomatis via trigger `notify_loyalty_points` |

## UX & Sinkronisasi Waktu (2026-04-22 update)
✅ **Time-slot live sync** — helper `src/lib/timeSlots.ts` (`filterFutureSlots`, `isSameLocalDay`, `slotToMinutes`, `TIME_TICK_MS`).
  - Buffer 30 menit dari jam lokal user, auto-tick tiap 60 detik.
  - Diterapkan di: `Checkout`, `MobileHero`, `MobileBookingWizard`, `BookingStatus` (reschedule), `QuickBookingDialog`, `StaffQuickBookingDialog`.
  - Slot lewat otomatis di-clear; bila habis menampilkan "Pilih tanggal lain".
✅ **Checkout multi-method payment** — Midtrans (otomatis), Bayar Tunai di Tempat, Bank Transfer Manual, QRIS Manual.
  - Edge function `midtrans-create-cart-checkout` menerima `payment_method`; manual method skip Snap, set `payment_status` sesuai (unpaid / awaiting_confirmation).
  - Manual flow: clear cart → redirect `/profile/history-perawatan`.
✅ **Compact UI pattern (InfoDot popup)** — semua deskripsi panjang yang sebelumnya makan ruang dipindah ke popover info "(i)".
  - Diterapkan: payment-method list, tire fulfillment radio (Pasang/Ambil), bundling banner Service+Ban di Checkout.
  - Aturan: 1 baris = ikon + label + badge ringkas + (i); detail di Popover.
✅ **NotificationBell** — badge tetap (tanpa pulse), `overflow-visible`, lingkaran sempurna `h-[18px] w-[18px]`.

## Blueprint Komponen Reusable
| Helper | File | Tujuan |
|---|---|---|
| `filterFutureSlots` | `src/lib/timeSlots.ts` | Filter time-slot berdasarkan jam live |
| `InfoDot` | inline di `Checkout.tsx` | Pattern popover (i) untuk info ringkas |
| `bookingStatus` | `src/lib/bookingStatus.ts` | Mapping status → label/color konsisten |
| `bookingPriority` | `src/lib/bookingPriority.ts` | Sorting prioritas booking staff |
| `serviceRecommendation` | `src/lib/serviceRecommendation.ts` | Rekomendasi servis berikutnya |

## System Flow Diagram
Lihat `/mnt/documents/system_flow.mmd` untuk diagram end-to-end (Booking → Payment → Service → Invoice → Loyalty).
