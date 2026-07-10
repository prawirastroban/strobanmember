# SPK Domain Refinement — Locked Scope

Consolidate everything SPK-related under a single **SPK / Work Order** domain in the dashboard. No new engines, no new business modules — every new surface is a **view** over data that already flows through Runtime → Workflow → Events → Timeline → Analytics.

## 1. Navigation Restructure

Add a single top-level dashboard entry **SPK / Work Order** with these children (in this order):

```text
Dashboard
└── SPK / Work Order
    ├── Dashboard          → SPK domain overview (KPIs from AnalyticsService)
    ├── Queue              → existing /spk (SPKWorkQueue)
    ├── New SPK            → create-new shortcut (opens intake form)
    ├── All SPK            → full list w/ filters (status, branch, mechanic)
    ├── Template Builder   → existing Phase 4 SchemaBuilder UI
    ├── Workflow           → existing workflow definitions viewer
    ├── Automation         → existing automation rules viewer
    ├── Configuration      → existing SPKConfigurationPanel (Phase 5.8)
    ├── Analytics          → existing AnalyticsService dashboards
    └── Reports            → presentation layer over Analytics
```

Changes:
- Edit `src/config/dashboardMenu.ts` to add the SPK section with the 10 children above.
- Remove any earlier plan/entry that placed **SPK Reports** under the global "Daftar Laporan" hub — SPK Reports live inside the SPK domain only.
- Existing `/spk` route stays as **Queue**; new routes are added under `/dashboard/spk/*` for the admin-side children.

## 2. Analytics (no new engine)

- Continue sourcing every metric from **Timeline → Events → Workflow** via `AnalyticsService`.
- The new **Analytics** page is a UI-only consumer: cards, charts, filters. No recomputation, no parallel aggregation, no new tables.
- Any new KPI request must first be checked against `AnalyticsService`; if not exposed, extend that service — do not build a second analytics path.

## 3. Reports (presentation only)

- Reports page renders the same data returned by `AnalyticsService`.
- Adds only: date-range picker, grouping toggle, export (Excel/PDF using existing report utilities).
- No new SQL aggregations, no client-side re-derivation of Analytics numbers.

## 4. Vehicle Health (interpretation, not a module)

A read-only view derived from existing SPK inspection outputs. Inputs allowed:
- inspection results (Suspension / Tyre / AC / Engine cards)
- inspection statuses (OK / NOT / NA)
- completed checklist ratio
- mechanic notes / findings
- prior completed SPKs for the same vehicle

Output: single categorical status per vehicle.

```text
NOT count = 0  and completion = 100%   → Excellent
NOT count ≤ 1  and completion ≥ 80%    → Good
NOT count 2–3  or  completion ≥ 60%    → Needs Attention
NOT count ≥ 4  or  critical finding    → Critical
```

- Implemented as a pure function `computeVehicleHealth(spk)` reading existing inspection fields; no persistence, no new tables, no AI, no predictions.
- Surfaces:
  - Vehicle detail page → badge + last-inspection summary.
  - Customer app (later) → same badge, read-only.

## 5. Service Reminder (reuse existing data)

- Continues to reuse the existing reminder pipeline; **no second reminder engine**.
- Inputs remain: service interval, mileage, previous service date, latest completed SPK.
- If a gap exists, extend the existing reminder service — never fork it.

## 6. Customer Experience (later, read-only)

The customer-facing surfaces read the same completed-SPK data:
- Vehicle Health badge (from §4)
- Service History (existing completed-SPK list)
- Next Service Reminder (from §5)

No duplicated storage; every value traces back to a completed SPK row.

## 7. Scope Lock (hard limits)

Reject additions that would break the lock:
- No new business modules beyond the navigation entries above.
- No AI diagnosis, predictive maintenance, ML, IoT, or external integrations.
- No new inspection forms or fields — Vehicle Health interprets what's already captured.
- No parallel analytics/reporting/reminder engines.

## Technical Details

Files touched (create/edit only — no deletes of existing runtime code):
- `src/config/dashboardMenu.ts` — add SPK section + children, remove SPK-in-global-reports entry.
- `src/pages/Admin.tsx` (or dashboard router) — register `/dashboard/spk/{dashboard,new,all,templates,workflow,automation,configuration,analytics,reports}` routes; **Queue** links to existing `/spk`.
- `src/pages/spk/admin/*` — thin page shells that mount existing panels:
  - Dashboard → wraps `AnalyticsService` summary cards.
  - New SPK → intake form (reuses SPKCanvas in create mode).
  - All SPK → list view backed by `SPKService.list()`.
  - Template Builder / Workflow / Automation / Configuration → mount existing components from Phases 4–5.8.
  - Analytics → mounts existing analytics dashboards.
  - Reports → new presentation component consuming `AnalyticsService` output; adds export via existing report utils.
- `src/lib/spk/vehicleHealth.ts` — pure interpreter function + `VehicleHealthBadge` component; consumed by vehicle detail and (later) customer views.
- No migrations, no new tables, no new edge functions.

Verification:
- `tsgo` clean.
- Navigate each new menu entry; confirm it mounts the existing panel with no duplicate data fetching.
- Confirm Vehicle Health badge renders for a completed SPK and updates when inspection values change.
