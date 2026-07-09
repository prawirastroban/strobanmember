# Phase 5.2 — SPK Work Queue UI (Design Only)

## Goal
Create a mobile-first SPK Work Queue page (`/spk`) that serves as the daily operational surface for Service Advisor, Foreman, and Mechanic. Pure UI with static placeholder data — no backend, runtime, or service changes.

## Files to Create
- `src/pages/spk/SPKWorkQueue.tsx` — main queue page

## Files to Modify
- `src/App.tsx` — add route `/spk` (rendering `SPKWorkQueue` inside `ProtectedRoute`)

## Design Decisions

### Layout (mobile-first, max-w-2xl centered)
1. **Sticky Search Header**
   - Search `<Input>` with magnifying-glass icon
   - Placeholder: "Cari nomor SPK, nama, plat, atau HP…"
   - Sticky `top-0` with `backdrop-blur` and bottom border
   - No backend search; client-side filters static array on mount

2. **Grouped Card Lists**
   - Four sections in fixed order:
     - **Sedang Dikerjakan** (active working)
     - **Menunggu** (waiting / pending)
     - **Menunggu Approval** (approval needed)
     - **Selesai Hari Ini** (completed today)
   - Each section: section header with count badge, then vertical stack of cards
   - Gap `gap-md` between cards, `gap-xl` between sections

3. **SPK Card**
   - Card component with `interactive-card` class for tap feedback
   - Tap navigates to `/spk/:id` (existing `SPKDetail` from Phase 5.1)
   - Contents:
     - Top row: SPK number (bold, truncated) + Status badge
     - Middle row: Customer name + Vehicle (plate inline or below)
     - Bottom row: Progress bar + Entry time + optional Priority badge
   - Large tap target (card itself clickable), no nested buttons
   - Status badge colors reuse Phase 5.1 tone system (`primary`, `amber`, `emerald`, `muted`)

4. **Floating Action Button**
   - Fixed bottom-right (or centered bottom bar) `+ SPK Baru`
   - Primary button with glow, `min-h-tap` compliant
   - Currently navigates to placeholder or shows toast (no API call)

5. **Empty States**
   - When a section has zero items, show friendly "Tidak ada SPK" with icon

### Static Placeholder Data
- Array of 8–10 mock SPK objects matching `SpkOrderRow` shape (from `src/services/spk/types.ts`):
  - `id`, `spk_number`, `customer_name`, `vehicle_desc`, `plate_number`, `status`, `progress_pct`, `entry_time`, `priority`
- Distributed across the four status groups so every section is populated for visual validation

### Visual Identity
- Dark theme, red-primary (`#ff2b2b`) accents
- Glassmorphism on sticky header
- Semantic tokens only (`bg-card`, `text-foreground`, `border-border`, etc.)
- Reuse existing shadcn components: `Card`, `Badge`, `Button`, `Input`, `Progress`, `Separator`
- Reuse existing helper classes: `ui-container`, `ui-stack`, `interactive-card`
- Icons from `lucide-react`

## What Will NOT Be Done
- No Supabase queries, no service calls, no runtime wiring
- No new business logic, no new hooks, no new utils
- No migration, no DB change, no edge function
- No analytics, no dashboard, no builder UI
- No changes to existing routes except adding `/spk`
- No changes to `SPKDetail.tsx`

## Validation
- Typecheck (`bunx tsc --noEmit`) must pass
- Route `/spk` renders without runtime errors
- Cards are tappable, search filters client-side, FAB is visible
