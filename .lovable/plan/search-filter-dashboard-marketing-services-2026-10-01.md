# Search & Filter — Dashboard Marketing /services

## Current state
- Route `/dashboard/marketing/services` renders `src/components/admin/ServiceManager.tsx` (Katalog Layanan).
- The list loads all services once (`fetchServices`) and renders a desktop table + mobile card list with drag-to-reorder. There is **no search and no filter** — with a growing catalog, finding one service means scrolling.

## What to build
Add a search bar and filter chips to the top of the Katalog Layanan panel, reusing the existing `FilterBarV2` component (same style as BookingsManager, CustomerList, PaymentsManager). Filtering is client-side over the already-loaded list — no new database queries.

### Filters
- **Search** (debounced 300ms): matches service name and description.
- **Quick chips** (toggle):
  - Per category (from `service_categories`, label + count) — single-select chip row, tap again to clear.
  - "Aktif" / "Nonaktif" — filter `is_active`.
  - "Populer" — filter `is_popular`.
  - "Tampil di Home" — filter `show_on_home`.
- **Result count** ("X layanan") shown in the bar; **Reset** clears everything.

### Interaction safety
- While a filter or search is active, hide the drag handle (grip icon) on rows/cards and skip drag-reorder persistence — reordering a filtered subset would write wrong `sort_order` values. Sorting stays available on the unfiltered list.
- Empty state message when no service matches ("Tidak ada layanan yang cocok" + Reset button).

### Files
- `src/components/admin/ServiceManager.tsx` — add filter state (search, category, status flags), `useMemo`-based filtered list, render `FilterBarV2` above both table and card list, pass filtered list to desktop/mobile rendering, gate drag handle when filtered.
- `src/utils/timelineFilter.ts` not needed (no date filter on this page).

## Verification
- `tsgo --noEmit` build check.
- Playwright against the preview: open /dashboard/marketing/services, type in search → list narrows and count updates; tap a category chip and "Nonaktif" → combined filtering; Reset → full list; confirm grip handle hidden while filtered.
