---
name: Internal Bug & Feedback Reports
description: Dashboard menu /dashboard/feedback for internal roles to file bug/revisi/masukan; Owner-only mark fixed
type: feature
---
- Table `internal_reports` (category bug|revisi|masukan, status open|in_progress|fixed, image_url, page_url, fixed_note).
- RLS: SELECT/INSERT for any internal role (admin/staff/admin_cabang) via `is_internal_user(uuid)` SECURITY DEFINER. Reporter can update/delete own when status<>fixed. Only `staff` (Owner) can mark fixed or update/delete any.
- Storage bucket public `internal-reports`; upload restricted to internal users.
- Realtime enabled on table.
- UI: `src/components/admin/internal/{InternalReports,ReportFormDialog,ReportCard}.tsx`. Sidebar item "Bug & Masukan" (Bug icon). Customer never sees dashboard so no extra gating needed.
