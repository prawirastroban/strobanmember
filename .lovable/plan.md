**Goal:** Make the BookingScanner result card render compactly on mobile (390px viewport) without overflowing horizontally.

**File touched:** `src/components/admin/BookingScanner.tsx` (UI only)

**Adjustments:**

1. **Action buttons (root cause of overflow).** Replace the single `flex gap-2` row with a responsive grid:
   - Mobile: `grid grid-cols-2 gap-2` — `Check-In & Konfirmasi` (primary) becomes `col-span-2` full-width on top; `Bayar Nanti` + `Scan Lagi` sit side-by-side below.
   - Desktop (`sm:`): collapse back to a single row using `sm:flex sm:gap-2` so behavior on tablet/desktop is unchanged.
   - Shorten primary label to "Check-In & Bayar" with `text-xs sm:text-sm whitespace-nowrap`.

2. **Card density.** `p-4 sm:p-5` and `space-y-4 sm:space-y-5` on the result CardContent.

3. **Total Tagihan block.** `p-3 sm:p-4`; amount `text-lg sm:text-xl` so it won't push the badge off-screen.

4. **Header row.** Booking code: `text-sm sm:text-base`; status badge: `text-[10px] sm:text-xs`.

5. **Row helper.** Label column `w-16 sm:w-20`; value `text-[13px] sm:text-sm` and add `truncate` so long names/branches don't wrap awkwardly.

6. **Payment-method radios.** `p-2.5 sm:p-3` and `gap-2 sm:gap-3` per option.

7. **Outer container.** Add `px-1 sm:px-0` to give a small inset on tiny screens.

No changes to scan logic, manual input, payment confirm flow, or RPC calls.

**QA:** verify at 390×686 (current preview) that the entire result card fits within viewport with no horizontal scroll, then confirm tablet/desktop still show the original single-row buttons.