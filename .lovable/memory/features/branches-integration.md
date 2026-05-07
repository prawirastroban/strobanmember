---
name: Branches Integration
description: Shared useBranches hook makes all branch dropdowns/filters reflect BranchManager settings
type: feature
---
- Hook: `src/hooks/useBranches.ts` — fetches `branches` (active, sorted by sort_order). In-memory cache; `invalidateBranchesCache()` after edits.
- Returns `{ id, slug, name }`. Use `slug` as value (matches `bookings.branch` data) and `name` as label.
- Wired into: BookingsManager, TransactionHistory, CustomerList (admin_cabang assign), EditCustomerDialog, SlotsManager, QuickBookingDialog, StaffQuickBookingDialog, ReportFilters, booking/CarInfoForm.
- BranchManager calls `invalidateBranchesCache()` on save/delete/toggle so changes propagate immediately to all filters.
