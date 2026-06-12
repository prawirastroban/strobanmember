---
name: App Version Control & Force Refresh
description: Build-time VITE __APP_VERSION__ vs server app_settings.app_version. VersionGate shows soft banner or blocking modal; hardReload clears app caches and unregisters /sw.js only. Admin panel at /dashboard/app-version.
type: feature
---
- Build version injected via Vite `define: { __APP_VERSION__ }` (format `YYYY.MMDD.HHmm`), exposed by `src/lib/appVersion.ts` (`APP_VERSION`, `compareVersion`, `hardReload`).
- Server source of truth: rows `app_version` and `app_min_version` in `public.app_settings`. Public SELECT allowed only for these two keys (anon + authenticated); writes still admin-only.
- `useAppVersion()` hook polls every 60s + on visibilitychange/online + realtime subscribe on `app_settings`.
- `<VersionGate />` mounted in `App.tsx`: soft glass banner (dismissable, remembered per latest) when behind; blocking dialog when `force_refresh=true` or build < `app_min_version`.
- `hardReload()` deletes all caches except those matching /firebase|fcm/i, unregisters only `/sw.js`, then `location.replace(?v=<latest>)` to bust HTTP cache.
- Admin UI: `/dashboard/app-version` (Owner only) — bump patch/minor/major, edit min version, release notes, Force Refresh toggle, Publish/Save Draft.
- DO NOT touch firebase-messaging-sw.js.