---
name: Quick Booking Onboarding (Staff → Customer)
description: After staff Quick Booking, customer receives WA welcome with set-password link and WA booking confirmation. Profile tagged acquisition_source='staff_created'.
type: feature
---
Onboarding + tracking flow for staff-created customers (P0 + P1):
- `admin-user-ops` `create_customer` sets `profiles.acquisition_source='staff_created'` and sends Fonnte WA welcome with `https://www.bengkelstroban.com/auth?login=phone&phone=<E164>` (auto-opens password-less OTP login dialog).
- After `bookings.insert` in `StaffQuickBookingDialog` & `QuickBookingDialog`, client fires `notify-booking-status` (non-blocking) → customer gets WA confirmation with `https://www.bengkelstroban.com/t/<public_track_token>` (public, no login).
- Bookings get auto-assigned `public_track_token` via BEFORE INSERT trigger `set_booking_track_token`. Public RPC `get_public_booking_by_token(_token)` returns masked subset (plate masked, first name only, no PII). Page `/t/:token` (PublicBookingTracker) polls every 20s.
- Phone-only login: edge fn `phone-otp-login` (actions `request`/`verify`). On verify, creates user via `phoneToEmail(phone)` if missing, generates magic-link via `auth.admin.generateLink`, returns `action_link` for client redirect to bootstrap session. Stored in `phone_otp_codes` table (5min TTL, max 5 attempts, 4 req/15min rate limit, RLS service-role only). Requires `SITE_URL` env or defaults to www.bengkelstroban.com.
- Failures in WA/notify never block main flow.
- Deferred (P2+): claim-tracking-to-account flow, SMS fallback for OTP, loyalty welcome WA bonus.