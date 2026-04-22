---
name: Compact UI with InfoDot popup
description: Long descriptions inside selectors, radios and banners must move into a Popover (i) trigger
type: design
---
Pattern: row = `[Icon][Label truncate][Badge ringkas][InfoDot]`. Detail copy lives inside `<InfoDot label="..."><p font-medium>Title</p><p text-muted-foreground>Detail</p></InfoDot>`.

Applied in `src/pages/Checkout.tsx`: payment methods list, tire fulfillment radio, Service+Ban bundling banner. Rule: never let helper text wrap or push layout — push into popover. Confirmation dialogs use sticky header + footer with `max-h-[88vh]` scrollable middle.
