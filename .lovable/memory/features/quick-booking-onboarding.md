---
name: Quick Booking Onboarding (Staff → Customer)
description: After staff Quick Booking, customer receives WA welcome with set-password link and WA booking confirmation. Profile tagged acquisition_source='staff_created'.
type: feature
---
P0 onboarding flow for staff-created customers:
- `admin-user-ops` action `create_customer` sets `profiles.acquisition_source='staff_created'` and (non-blocking) sends Fonnte WA to the customer's phone with link `https://www.bengkelstroban.com/reset-password-wa?phone=<E164>` so they can self-set their password via OTP. Only sent for NEW users (not when reusing existing auth row).
- After `bookings.insert` in both `StaffQuickBookingDialog` and `QuickBookingDialog`, the client fires `notify-booking-status` (non-blocking) so the customer receives WA confirmation with tracking link.
- Failures in WA/notify never block the main flow; logged to console / response field `welcome_wa`.
- Deferred (P1+): public no-login tracking page, phone-only accounts via phoneToEmail(), phone-based dedup, loyalty welcome WA.