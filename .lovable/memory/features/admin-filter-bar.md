---
name: Admin FilterBar
description: Reusable mobile-first filter component for admin pages with Accurate-style timeline presets
type: feature
---
- Component: `src/components/admin/filters/FilterBar.tsx` — search, timeline, chips, dropdowns, ranges, reset.
- Helper: `src/utils/timelineFilter.ts` — `getDateRange(timeline)`, `DEFAULT_TIMELINE = { preset: 'this_month' }`, presets: today/yesterday/this_week/last_week/this_month/last_month/this_quarter/this_year/custom.
- Applied to: BookingsManager, CustomerList, TransactionHistory, PaymentsManager.
- Pattern: 350ms debounced search, timeline filters `created_at` server-side via `.gte/.lte`. Reset restores defaults.
- Mobile rules: chips `overflow-x:auto flex-nowrap`, dropdowns `flex:1 min-w:0`, range inputs `w:88px`, no element exceeds 390px viewport.
- Schema mapping: uses real DB columns (branch text, payment_method, payment_status, ends_at). Skipped filters where columns don't exist (tires.stock, loyalty tier, profiles.email).
