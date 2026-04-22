---
name: Checkout multi-method payment
description: Cart checkout supports Midtrans plus three manual methods with distinct status flow
type: feature
---
Edge `supabase/functions/midtrans-create-cart-checkout` accepts `payment_method` ∈ {midtrans, pay_at_workshop, transfer, qris}. Manual methods skip Snap, return `{ manual: true }`, set booking_status `pay_later` (workshop) or `awaiting_confirmation` (transfer/qris), and require staff confirmation via `confirm_manual_payment` RPC.

Frontend `Checkout.tsx`: RadioGroup inside AlertDialog with `PAYMENT_METHODS` array. On manual success → `clearCart()` + navigate `/profile/history-perawatan`. On Midtrans → Snap; onSuccess/onPending → history page.
