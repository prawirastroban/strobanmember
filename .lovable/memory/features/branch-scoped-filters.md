---
name: Branch-Scoped Filters
description: Branch dropdowns/filters in /dashboard auto-lock to assigned branch for admin_cabang
type: feature
---
- Hook `useScopedBranches()` in `src/hooks/useBranches.ts` is the single source of truth for branch dropdowns/filters in the dashboard.
- For role `admin_cabang`: returns only the matched branch (by slug, fallback to name) plus `isLocked: true` and `lockedBranch` (slug).
- All branch filters MUST use it: BookingsManager, TransactionHistory, SlotsManager, ReportFilters, QuickBookingDialog, StaffQuickBookingDialog, EditCustomerDialog.
- When `isLocked`: hide "Semua Cabang" option, set value to `lockedBranch`, disable the Select.
- RLS (`is_admin_cabang_for`) already enforces server-side; this is the UX guardrail.
