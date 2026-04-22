---
name: Time-slot live sync
description: All booking time pickers filter slots by user's local time via shared helper
type: feature
---
Helper `src/lib/timeSlots.ts` provides `filterFutureSlots(slots, date, now, buffer=30)`, `isSameLocalDay`, `slotToMinutes`, `TIME_TICK_MS=60000`.

Used by: Checkout, MobileHero, MobileBookingWizard, BookingStatus (reschedule), QuickBookingDialog, StaffQuickBookingDialog. Each component sets up `setInterval(setNow, TIME_TICK_MS)` and auto-clears `time` when it falls below cutoff. When list is empty, show "Pilih tanggal lain" inline. Buffer is 30 minutes.
