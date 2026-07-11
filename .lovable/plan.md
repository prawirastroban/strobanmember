
## Scope
UI-only cleanup + presentation of workflow status inside the SPK form. No DB/schema/workflow-engine changes. Approval matrix rows in the DB are left untouched — the UI editor is just hidden and the Canvas stops using the matrix to hide/show signature blocks.

## Changes

### 1. `src/components/admin/system/spk/SPKConfigurationPanel.tsx`
- Remove `<TabsTrigger value="workflow">` and `<TabsTrigger value="approval">` from `TabsList`.
- Remove the matching `<TabsContent>` blocks.
- Drop the now-unused `WorkflowViewer` and `ApprovalMatrixEditor` components and their unused imports (`GitBranch`, `CheckSquare`, `Switch`, `DEFAULT_APPROVAL_MATRIX`, `ApprovalMatrixConfig`, `RuntimeBus`, `spk_workflow_definitions/transitions` reads).
- Remaining tabs: **Role Profiles**, **Numbering**, **Automation**.

### 2. `src/components/spk/canvas/ApprovalCard.tsx` — signatures always visible
- Remove the `matrix.final_approval` / `matrix.qc_required` gating around the signature grid and the Final Check block.
- Always render all three `SignaturePadBound` pads (Admin, Customer, Mekanik) and both Final Check toggles.
- Delete the empty-state fallback paragraph (no longer reachable).
- No hook or Runtime changes; `useFormRuntimeSafe`/`useSectionBinding` calls stay.

### 3. `src/pages/spk/SPKCanvas.tsx` — workflow stepper in the sticky header
- Add a new lightweight `WorkflowStatusStrip` rendered right below the section-jump nav (still inside the sticky `<header>`), before the progress divider.
- Data source: existing `spkRow.status` (already in state) and the ordered phase list defined locally in the component:
  ```
  Draft → Dikerjakan → Menunggu Approval Customer → Final Check Mekanik → Selesai
  ```
  mapped from statuses `draft`, `in_progress`, `awaiting_customer_approval`, `qc_pending` (with `qc_passed` also mapped here), `closed` (with `invoice_issued`/`invoice_paid` folded in). Any unknown status falls back to showing the raw `meta.status` badge only, so exotic states from the workflow engine never break the strip.
- Visual: horizontal pill row, 1 pill per phase, current phase highlighted with the same primary accent already used by the status badge; completed phases use the same emerald tint used by the section nav; upcoming phases muted. Fully responsive (horizontal scroll on narrow widths, same overflow pattern as the section nav).
- Keep the existing status `Badge` (`{meta.status}`) in the top row so the exact raw status is still visible.
- No changes to `useSPKWorkflow`, transitions, or the action bar.

### 4. Sanity
- `ApprovalCard` still reads `useFormRuntimeSafe()` because `useSectionBinding` needs it; only the `matrix` reads are removed.
- `SPKConfigurationPanel` still writes `spk.role_profiles`, `spk.numbering`, and `spk.automation` via `OperationalConfigService` — the removed tabs never persisted anything new, so no migration is required.
- Existing rows in `app_settings` for `spk.approval_matrix` remain but become inert for the Canvas gate; the user can edit them manually via the DB as requested.

## Out of scope
- No backend, RLS, workflow engine, or role-mapping changes.
- No changes to the customer approval page, print/PDF, or automation triggers.
