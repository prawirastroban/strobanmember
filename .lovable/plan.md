## Goal

Make every SPK surface (screen + PDF) fully responsive and overflow-safe without touching business logic, and simplify the share panel: one tracking link, plus an activation (claim account) link when the customer has no active account.

## Part 1 — Responsive audit & fixes (presentation only)

Apply a consistent set of layout rules across all SPK components. No handler, query, workflow, or calculation is changed.

Shared conventions to apply everywhere:
- Every flex/grid child that holds text gets `min-w-0`; long values get `break-words` / `[overflow-wrap:anywhere]`; monospace codes (SPK number, links, plate) get `break-all`.
- Label/value rows switch from fixed 2-column to stacked on `<sm`, side-by-side from `sm:` up.
- Grids step `grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-3/4` instead of fixed multi-column.
- Tables wrap in a horizontal scroll container on mobile, or reflow into stacked rows where a table is only 2–3 columns.
- Signature pads become fluid-width (canvas resizes to container, fixed aspect ratio) instead of fixed pixel widths.
- Sticky headers/action bars get safe-area padding and wrap their buttons on narrow screens.
- Typography scale: `text-xs sm:text-sm` for meta, `text-sm sm:text-base` for values — no shrinking below 11px.

Components to audit and fix:

```text
Canvas / editing
  pages/spk/SPKCanvas.tsx            header, tabs, sticky footer, review dialog
  pages/spk/SPKNewForm.tsx           form grids, package picker, signature area
  canvas/CanvasHeader.tsx            title + status + meta row
  canvas/CanvasSection.tsx           header actions wrap, read-only badge
  canvas/v2/ChecklistGroup.tsx       checklist grid + note fields
  canvas/InspectionRowBound.tsx      label / toggle / note alignment
  canvas/ConditionRow, OkNotToggle   toggle group wrapping on 320px
  canvas/CustomerCard, VehicleCard, ComplaintCard, ServiceOrderCard,
  ACCheckCard, TyreCheckCard, InspectionEngineCard,
  InspectionSuspensionCard, MechanicNotesCard, TimeTrackingCard
  canvas/FinalizationCard.tsx        checklist + dual signatures
  canvas/SignaturePad / SignaturePadBound   fluid canvas sizing
  canvas/PhotoDropzone.tsx           thumbnail grid reflow

Lists / views
  pages/spk/admin/SPKAllList.tsx     filter bar, card meta, action buttons
  pages/spk/admin/SPKReportsPage.tsx, SPKDomainDashboard.tsx,
  SPKVehicleHealthPage.tsx, SPKCustomerSummaryPage.tsx, SPKWorkflowViewer.tsx
  components/spk/CustomerSPKCard.tsx, AIHealthCard.tsx,
  OperationalTimeline.tsx, VehicleHealthBadge.tsx, SPKViewDialog.tsx
  pages/spk/SPKPublicTracker.tsx     stage list, 2-col meta grid, timeline
  pages/spk/SPKCustomerApprove.tsx   approval + signature on mobile
```

## Part 2 — PDF / print parity

`pages/spk/SPKPrint.tsx` keeps its current html2canvas + jsPDF pipeline and all data mapping. Layout work only:
- Render the document into a fixed A4 content frame (794px @96dpi ≈ 210mm, ~15mm padding) that is horizontally scrollable/scaled on small screens but always captured at full A4 width, so on-screen preview and PDF match.
- Multi-page: slice the canvas by A4 page height and add `page-break-inside: avoid` equivalents on cards/table rows so no card or signature block is cut mid-element.
- Print CSS (`@media print`) mirrors the same frame so browser print output equals the PDF.
- Keep the same card/grid structure as the screen sections (same order, same labels) with fixed-width label columns and `colgroup` tables already in place, extended with word-wrap so long notes never overflow a cell.

## Part 3 — Share panel changes (`components/spk/SPKShareCard.tsx`)

- Show **one** link only: the live tracking link `https://www.bengkelstroban.com/spk/:id/track`. The QR, copy button, and WhatsApp message all use this single link. The separate PDF link input and its copy button are removed (the PDF stays reachable from the tracker page's existing "Lembar SPK (PDF)" button).
- Add an **activation link** block, mirroring `BookingShareCard`:
  - If the SPK's customer profile exists but the account has never signed in, show a "Terbitkan Link Aktivasi" button that calls the existing `admin-user-ops` `issue_claim_token` action and renders `…/claim/<token>` with copy + WhatsApp share.
  - If the account is already active, no activation block is shown (tracking link only).
  - If the SPK has no linked customer account at all (walk-in), show a short note that an account must exist first — no new account-creation logic is added.
- `SPKAllList.tsx` / `SPKViewDialog.tsx` pass the SPK's `customer_id` through to the share card so the claim action has a target user.

## Technical notes

- No migrations, no edge function changes, no new RPCs — `issue_claim_token` and `get_public_spk` are used as-is.
- Whether the customer account is "already active" is determined by the same 409 response `issue_claim_token` already returns, plus the existing profile lookup in the list — no new server checks.
- All changes are Tailwind classes, small layout wrappers, and canvas sizing; state, effects, validation, autosave, workflow transitions and AI analysis remain untouched.
