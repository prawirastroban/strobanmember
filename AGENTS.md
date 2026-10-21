- Pricelist data lives in `pricelist_items` (one row per item, `category` column); bulk updates go through the admin-only `replace_pricelist` RPC so an Excel import replaces a category atomically.

- Oil pricelist uses dedicated item_code, item_name and unit columns with category-aware parsing, search and views; this preserves the Excel meaning without overloading tire fields.

- Pricelist item names and inline vehicle details use `PricelistItemName` with ResizeObserver-based overflow detection; this keeps the conditional detail control accurate when the available width changes.

- Dashboard main headings belong to `AdminLayout`; panels keep only distinct section headings. Detail pages opt out with `showPageHeading={false}` and render their own specific `h1`, preventing duplicate titles without hiding navigation or actions.
- SPK reads use bounded requests with explicit failure/retry states; optional branch metadata loads after the record, so connection failures cannot leave saved documents waiting indefinitely.
- App updates are never mandatory: the shared `requiresNativeUpdate` predicate returns false so the route gate and force dialog stay off; update notices (UpdateDialogHost, UpdateAvailableToast, VersionGate, UpdatePopup) are not mounted; admins push new web code with Force Refresh.
- Native version comparisons read App.getInfo (installed versionName/versionCode), never Vite's web build timestamp; realtime native events recheck the same source to keep enforcement consistent.
- Published `app_releases` rows must carry the Android versionCode as `build_number` (required by the release form); the registry returns null for a missing build, because installed AABs compare it against their own versionCode and a date fallback makes every phone look outdated.
