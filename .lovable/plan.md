# Plan: Make Bottom Sheet Height Flexible on Mobile

## Goal
Make every bottom sheet (`side="bottom"`) adapt its height to the actual mobile screen length, instead of using fixed `vh` limits that can cut content on short devices or waste space on tall devices.

## Current state
- `src/components/ui/sheet.tsx` defines the bottom-sheet base style without any max-height; consumers add their own `max-h-[70vh]` / `max-h-[85vh]`.
- `CartSheetDialog.tsx` and `HeroBookingForm.tsx` hardcode `max-h-[85vh]` (and one `70vh`).
- The selected overlay element (`sheet.tsx:20`) is just the backdrop; the real sizing issue is `SheetContent`.

## Proposed changes

### 1. Update base bottom-sheet variant in `sheet.tsx`
Change the `bottom` variant in `sheetVariants` to:
- Use `max-h-[85dvh]` (dynamic viewport height) so browser UI changes don't hide content.
- Add `h-auto` so the sheet shrinks to its content when content is short.
- Add bottom safe-area padding (`pb-[max(1rem,env(safe-area-inset-bottom))]`).
- Keep `rounded-t-3xl` and swipe-to-close behavior.

### 2. Audit and clean up consumers
For every `side="bottom"` usage:
- Remove redundant/conflicting `max-h-[...vh]` classes.
- Keep `flex flex-col` layouts.
- Make the scrollable content area use `flex-1 min-h-0 overflow-y-auto` so it fills available dynamic height without overflowing.
- Ensure sticky headers/footers do not push content outside the sheet.

Files to update:
- `src/components/cart/CartSheetDialog.tsx`
- `src/components/mobile/home/HeroBookingForm.tsx` (4 bottom sheets)

### 3. Verify with mobile viewport
- Preview on a short mobile viewport (e.g., iPhone SE) and a tall one (e.g., iPhone 15 Pro Max).
- Confirm no content is cut off, no double scrollbars, and swipe-to-close still works.

## Out of scope
- No changes to business logic, data flow, or non-bottom-sheet dialogs.
- No changes to the overlay backdrop color/behavior.
