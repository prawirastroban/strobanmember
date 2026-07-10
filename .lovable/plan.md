## Problem
In `SPKUXContext.tsx`, when a required text field (e.g., `complaint_note`) receives its first character, the section's status flips from `waiting` → `complete` (single-required section), which triggers:
1. Auto-collapse of the section
2. Smart auto-scroll to the next incomplete section

This interrupts the user mid-typing after just 1 character.

## Fix (UX-only, single file)
Edit `src/components/spk/canvas/SPKUXContext.tsx` — inside the completion-transition `useEffect` (lines 96–133):

Before triggering auto-collapse or auto-scroll for a section that just became `complete`, check whether the currently focused element (`document.activeElement`) is a text input/textarea/contenteditable **inside that section's DOM node** (`refs.current[s.id]`).

- If yes → the user is still typing; skip both auto-collapse and auto-scroll for that section this cycle. The next value change (or blur) will re-run the effect and, if the field is still filled and focus has moved, the normal behavior resumes.
- If no → keep current behavior (collapse + scroll to next incomplete section).

Also update `prevStatusRef.current` only for sections where the transition was actually applied, so a skipped section can still trigger collapse/scroll later once the user leaves the field. Simpler: keep `prevStatusRef` as-is but re-derive on any values change (already the case since effect depends on `statuses`).

Actually cleanest: keep updating `prevStatusRef.current = statuses` at the end, but for skipped sections force their remembered prev status to remain non-complete so the transition can re-fire when focus leaves. Implement by cloning statuses and overwriting skipped ids to their previous value before assigning to `prevStatusRef.current`.

No changes to Runtime, Workflow, backend, or any other file.

## Verification
- Type 1 char into "Catatan Customer" → section stays expanded, page does not jump.
- Finish typing and click outside → next incomplete section may auto-scroll (existing behavior preserved).
- Toggling OK/NOT inspection rows (no focused text field) still auto-collapses + scrolls as before.
