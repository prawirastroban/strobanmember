---
name: ui-ux-pro-max
description: UI/UX quality standard (adapted from nextlevelbuilder/ui-ux-pro-max-skill) for designing, auditing, or fixing any screen, component, dialog, table, form, or layout in the Stroban app across mobile, tablet, and desktop. Use for redesigns, UI audits, visual bug fixes, responsive/safe-area issues, and new UI features.
---

# UI/UX Pro Max (Stroban edition)

Apply these rules whenever you touch UI. Keep business logic, data flow, and routes unchanged unless the user asks. Preserve Stroban identity: liquid-glass surfaces, red accent (primary token, #ff2b2b), Bahasa Indonesia copy, formats 'Rp 150.000' / '15 Okt 2023' / 24h time.

## Workflow
1. Read the target files and relevant `mem://` entries first.
2. Audit against the 10 pillars below; list findings by priority (Critical → Low).
3. Fix in small batches (one page or flow at a time). Never rewrite whole flows.
4. Verify with Playwright at 390x844 (phone), 820x1180 (tablet), 1280x1800 (desktop): no overlap, no horizontal scroll, no clipped text, one h1 per page.
5. Report what changed in plain user language.

## 10 pillars (priority order)
1. **Accessibility (Critical)**: text contrast ≥4.5:1; icon-only buttons need `aria-label`; visible focus ring; keyboard reachable; labels tied to inputs.
2. **Touch & interaction (Critical)**: targets ≥44x44px, ≥8px gap between targets; every async action shows loading/disabled state; no hover-only affordances.
3. **Performance (High)**: avoid layout shift (reserve image/skeleton size); lazy-load below-fold images; no heavy filters/drop-shadow on Android; animate only transform/opacity.
4. **Style consistency (High)**: semantic tokens only (no hardcoded colors); lucide SVG icons, no emoji icons; one radius scale; shadcn variants over custom classes.
5. **Layout & responsive (High)**: mobile-first; 4/8pt spacing scale; `min-w-0` + `truncate` in flex/grid children; respect `env(safe-area-inset-*)` on headers, bottom nav, sheets; sheets max 85dvh; fixed bars must not cover content.
6. **Typography & color**: body ≥14px on mobile (16px for inputs to avoid iOS zoom); line-height ~1.5; clear hierarchy (one h1, section h2/h3); numbers tabular-nums in tables/prices.
7. **Animation**: purposeful, 150–300ms, respect `prefers-reduced-motion`; 1.03 scale hover only on desktop pointers.
8. **Forms & feedback**: visible labels, required markers, error text next to the field, toast for success; progressive disclosure for advanced options; never lose typed input.
9. **Navigation**: consistent back button; bottom nav ≤5 items; dialogs have a reachable close that never overlaps actions; deep links keep state.
10. **Data & tables**: sticky headers/filters where long; aligned columns (grid, not flex-wrap); empty, loading (skeleton), and error-with-retry states for every list.

## State checklist for every component
Default · Hover/Active · Focus · Loading · Empty · Error (with retry) · Disabled.

## Print/PDF isolation
SPK preview/PDF layouts are documents: fixed widths, no responsive classes inside the sheet, verify html2canvas output matches preview. Do not let app UI changes leak into print sheets.

## Don'ts
- No generic purple gradients, Inter/Poppins defaults, or emoji as icons.
- Don't remove features or change data while "polishing".
- Don't duplicate page titles (AdminLayout owns the dashboard h1).
