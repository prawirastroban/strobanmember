---
name: Reports Hub (Daftar Laporan)
description: Accurate-style report center with timeline filters, KPI strip, sortable table, Excel & PDF export
type: feature
---
- Sidebar entry: "Daftar Laporan" (icon FileBarChart) — collapsible group with 8 categories.
- Routes: `/dashboard/reports` (overview), `/dashboard/reports/:category`, `/dashboard/reports/:category/:id`.
- Files: `src/components/admin/reports/` — `ReportRegistry.ts`, `ReportsOverview.tsx`, `ReportCategoryPage.tsx`, `ReportDetailPage.tsx`, `ReportTable.tsx`, `ReportFilters.tsx`, `ReportKPIStrip.tsx`, `exporters/exportToExcel.ts`, `exporters/exportToPdf.ts`, `types.ts`.
- Categories: sales, finance (sensitive), payments (sensitive), customers, vehicles, loyalty, promos, operations.
- Add a new report: append `ReportDefinition` to `REPORTS` in `ReportRegistry.ts` — supply `id`, `category`, `title`, `columns[]`, async `load({start,end,branch})`, optional `kpis(rows)`.
- Filters: timeline preset (reuses `src/utils/timelineFilter.ts`) + branch dropdown (from `branches` table). Sensitive categories hidden when `!canManageFinancial`.
- Export: SheetJS (`xlsx`), `jspdf` + `jspdf-autotable`. Filename `{report_id}_{YYYYMMDD-HHmm}`. PDF uses `useBranding()` for header, A4 landscape.
- Format helpers: `src/lib/reportFormat.ts` — `formatRupiah`, `formatNumber`, `formatDateID`, `formatDateTimeID`, `fileStamp`.
- ColumnFormat: `text|number|currency|date|datetime|percent`. Set `total: true` for footer sum row (Excel & PDF & Table).