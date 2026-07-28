## Goal

Rebuild the SPK presentation layer mobile-first so nothing clips, rotates, overlaps or overflows on any screen, and split the PDF into its own dedicated A4 layout. No logic, data, workflow, or API changes.

## 1. Shared responsive primitives (new, presentation only)

Add a small set of layout helpers used by every SPK component, so fixes are systematic instead of per-file CSS patches:

```text
src/components/spk/ui/
  SpkField.tsx      label + value; stacks <768px, side-by-side >=md, always wraps
  SpkGrid.tsx       auto-fit grid: repeat(auto-fit, minmax(min(100%, 15rem), 1fr))
  SpkDataTable.tsx  table >=md, stacked label/value cards <md (same data, same order)
  spk-type.ts       clamp() type scale tokens (title/label/value/mono)
```

Global CSS additions in `index.css` (scoped under `.spk-scope`): `min-width:0` defaults for flex/grid children, `overflow-wrap:anywhere`, `hyphens:auto`, `white-space:normal` (kills the vertical/one-letter-per-line text), `max-width:100%` on all media and canvases.

Type scale via `clamp()`, e.g. title `clamp(1.05rem, 3.2vw, 1.6rem)`, label `clamp(.66rem, 1.9vw, .75rem)`, value `clamp(.8rem, 2.4vw, .95rem)`, mono `clamp(.7rem, 2.2vw, .85rem)`.

## 2. Component-by-component audit

Every file below is rewritten to: drop fixed `w-[..]`/`h-[..]`/`min-w-[..]`, replace `grid-cols-2/3/4` with `SpkGrid` (auto-fit) or `grid-cols-1 md:grid-cols-N`, wrap every text node, and make card height content-driven.

```text
Header / shell
  canvas/CanvasHeader.tsx    STROBAN title, SPK number, date, branch: flex-wrap
                             row, never truncated, never rotated; mono number
                             uses break-all + clamp
  canvas/CanvasSection.tsx   header actions wrap, read-only badge inline-flex
  pages/spk/SPKCanvas.tsx    sticky header/footer wrap + safe-area, review dialog
                             becomes full-height scrollable on mobile

Data cards (2-col -> 1-col <768px)
  CustomerCard, VehicleCard, ComplaintCard, ServiceOrderCard,
  TimeTrackingCard, MechanicNotesCard, ACCheckCard, TyreCheckCard,
  InspectionEngineCard, InspectionSuspensionCard, ApprovalCard

Mechanic canvas v2
  v2/MechanicTabs.tsx     tab strip wraps / scrolls, no shrink
  v2/ChecklistGroup.tsx   auto-fit rows, note under toggle
  v2/ConditionRow.tsx     label / toggle / note stack at 320px
  v2/LampsRow.tsx, v2/TyreCheckPanel.tsx   auto-fit chips
  v2/EstimasiTable.tsx    -> SpkDataTable (stacked cards <md)
  canvas/OkNotToggle.tsx, InspectionRowBound.tsx   wrap toggle group

Signatures & media
  SignaturePad / SignaturePadBound   fluid canvas (ResizeObserver-free:
                                     container width + fixed aspect-ratio),
                                     no fixed pixel width, redraw preserved
  PhotoDropzone.tsx                  auto-fit thumbnail grid

Lists / public views
  admin/SPKAllList.tsx (filter bar, card meta, action buttons),
  SPKReportsPage, SPKDomainDashboard, SPKVehicleHealthPage,
  SPKCustomerSummaryPage, SPKWorkflowViewer,
  CustomerSPKCard, AIHealthCard, OperationalTimeline,
  VehicleHealthBadge, SPKShareCard, SPKViewDialog,
  SPKPublicTracker, SPKCustomerApprove, SPKNewForm, SPKDetail
```

All tables in these pages route through `SpkDataTable` so they stack instead of shrinking columns.

## 3. Dedicated A4 PDF layout

`SPKPrint.tsx` stops reusing the responsive screen layout. Instead:

- New `src/pages/spk/print/A4Document.tsx` — a print-only component rendered inside a fixed 794px x 1123px page frame (210x297mm @96dpi, 12mm margins), fixed pt-based typography, fixed label columns and `colgroup` tables. Same data, same field order, same labels as the screen.
- On mobile the A4 frame is shown inside a horizontally-centered wrapper scaled with `transform: scale(containerWidth / 794)` so the preview matches the export exactly.
- Export path: html2canvas captures the unscaled frame; pagination slices on `data-pdf-block` boundaries so no card, table row, or signature is cut.
- `@media print` reuses the same frame so browser print equals the generated PDF.
- Data mapping in `spkDisplayMap.ts` is untouched.

## 4. Verification

- Playwright screenshots at 320 / 375 / 414 / 768 / 1024 / 1440 px for: Canvas, `/spk/new`, All SPK list, public tracker, customer approve, print preview.
- Automated overflow check per breakpoint (`scrollWidth > clientWidth` on any SPK node) plus visual review of every screenshot.
- Exported PDF rendered to images with `pdftoppm` and visually inspected page by page.
- `tsgo --noEmit` typecheck.

## Technical notes

No changes to hooks, services, runtime engines, RPCs, migrations, workflow transitions, autosave, or AI analysis. Work is limited to JSX structure, Tailwind/CSS, the new layout primitives, and the print component.
