## Goal
1. During mechanic work, replace the "Lewati & lanjut" ghost button with a solid **"Lanjut"** button that also marks the current section **Selesai** — without requiring the textarea to be filled.
2. Fix the OK / NOT / N/A toggle so a tap always registers and stays visually selected.

## Changes

### 1. Section "Lanjut" button (marks section complete)

**`src/components/spk/canvas/SPKUXContext.tsx`**
- Add `ackSectionIds: Set<string>`, `ackSection(id)`, and `unackSection(id)` to the context.
- Persist the acknowledged set in `localStorage` per `spkId` so status survives navigation and autosave.
- Update `statuses` derivation:
  - A section is `"complete"` if **either** every `requires` field is filled **or** the section id is in `ackSectionIds`.
  - If any `requires` field later gets a value that clears (or the user reopens the section), keep it complete — ack is sticky until manually un-acked.
- Skip the ack path for sections whose "completeness" is externally driven (e.g. `sec-time` which has `requires: []` — leave as-is).

**`src/components/spk/canvas/SkipToNextButton.tsx`**
- Rename intent from "skip" to "advance & complete". Keep filename to avoid churn but export the new behavior:
  - Rename the visible label to **"Lanjut"** with a solid style (primary tone), full-tap height.
  - On click: call the new `ackSection(sectionId)` from `useSPKUXSafe()`, then `jumpTo(nextSectionId)` (same as today).
  - Continue to hide itself when `show={false}` (i.e. the textarea already has content) so once the mechanic writes a note the button collapses and the natural completion heuristic takes over.
  - If `sectionId` has no next section, still ack and show a subtle "Bagian ini selesai" state instead of hiding entirely.

No changes needed at the individual card level (`ComplaintCard`, `ServiceOrderCard`, `InspectionSuspensionCard`, `InspectionEngineCard`, `ACCheckCard`, `MechanicNotesCard`) — they already pass `sectionId` and the correct `show` flag.

### 2. Fix OK / NOT / N/A toggle "click doesn't stick"

Root cause: when the tap on the last remaining required toggle completes the section, `SPKUXContext` auto-collapses the section on the same render, so the just-selected button unmounts before the user sees the highlight. Result reads as "tombol tidak berubah".

**`src/components/spk/canvas/SPKUXContext.tsx`**
- Extend the existing `isTypingInside` guard to also treat a **just-tapped OK/NOT/N/A control** as "still interacting":
  - Track `lastInteractionRef: { id, ts }` updated via a delegated `pointerdown` listener on each section root; skip auto-collapse for ~600 ms after that interaction.
  - Existing textarea-focus guard stays.
- Add an explicit 250 ms visual delay between "section transitions to complete" and "auto-collapse fires" so the emerald highlight is visible before the panel folds.

**`src/components/spk/canvas/OkNotToggle.tsx`**
- Add `event.preventDefault()` in each button's `onClick` and `type="button"` (already present) — belt-and-suspenders against implicit form-submit inside cards.
- Ensure `aria-pressed` (in addition to `aria-checked`) so the "SC" and OK/NOT/N/A both reflect a definite pressed state.
- Add a subtle 150 ms ring-scale on selection for immediate optical feedback (Tailwind classes only).

**`src/components/spk/canvas/InspectionRowBound.tsx`**
- Ensure the write path is fire-and-forget on the pointer event, not on click:
  - Switch the toggle's handler to run inside `React.startTransition` via a local `useTransition` so the state update is not deferred by a concurrent hydration pass from `FormRuntimeProvider` (which merges `initialValues` from `useSPKRow` after autosave `onSaved` refreshes `spkRow`).
- No behavior change for read-only scopes — `useBinding` already swallows writes when the section is not editable.

### 3. Safety verification (no data-flow change)
- Confirm mechanic role scope in `RoleProfiles.ts` still lists `suspension / tyre / ac / engine / notes` as editable so the toggles remain interactive.
- No DB / RLS / edge function changes.
- Autosave (`useSPKAutosave.ts`) untouched — the ack flag lives in `localStorage`, not in `spk_orders.data`, so it never round-trips through the server.

## Result
- Mechanic can advance any optional-note section with one tap on **"Lanjut"**; the section is immediately marked **Selesai**.
- OK / NOT / N/A taps register on the first touch and remain visually highlighted; auto-collapse waits until the user has visually confirmed their choice.
