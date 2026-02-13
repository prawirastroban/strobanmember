

## Fix Upcoming Appointments Mobile Text Alignment

### Problems Identified
1. The card header squeezes the title and "Book New" button on small screens
2. Inside each booking card, the price, status badge, and cancel button are all forced onto one horizontal line on mobile, causing misalignment
3. Cancelled booking cards have the same issue with the badge and reschedule button

### Changes

**File: `src/components/UpcomingBookings.tsx`**

1. **Card Header** -- Make the header stack vertically on mobile so the title and "Book New" button don't overlap:
   - Change from `flex items-center justify-between` to `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`

2. **Active Booking Cards** -- Make the price/badge/cancel row wrap properly on mobile:
   - Change the bottom action row from `flex items-center gap-2 ml-11 sm:ml-0` to `flex flex-wrap items-center gap-2 ml-11 sm:ml-0` so items wrap to a new line if needed

3. **Cancelled Booking Cards** -- Same fix for the badge and reschedule button row:
   - Change from `flex items-center gap-2 ml-11 sm:ml-0` to `flex flex-wrap items-center gap-2 ml-11 sm:ml-0`

These are small, targeted CSS changes that ensure text and buttons flow naturally on narrow screens without overlapping.

