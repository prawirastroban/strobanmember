---
name: QR Scan Booking
description: Customer shows QR (booking UUID) on PaymentDialog awaiting/pay_later result + MyBooking sticky card; admin scans at /dashboard/scanner via @yudiel/react-qr-scanner. Confirms via confirm_manual_payment RPC; admin_cabang gated to own branch.
type: feature
---
- Libraries: `qrcode.react` (display), `@yudiel/react-qr-scanner` (camera)
- Components: `src/components/booking/BookingQRCard.tsx`, `src/components/admin/BookingScanner.tsx`
- Route: `/dashboard/scanner`, sidebar item "Scan QR Booking" (ScanLine icon), visible to all admin roles
- QR payload = booking.id (UUID); short code shown = id.slice(0,8).toUpperCase()
- Manual lookup accepts full UUID or 6-8 hex chars (ilike id, code+'%', limit 2 → reject if ambiguous)
- Branch guard in scanner: admin_cabang → reject if booking.branch !== userBranch
- Confirm flow: insert payment row if missing (method default cash) → call `confirm_manual_payment`
