## Problem

`npm install` fails with ERESOLVE because `@codetrix-studio/capacitor-google-auth@3.x` requires `@capacitor/core ^5.0.0`, but the project is on Capacitor 8. The earlier cleanup removed the plugin from `src/lib/googleAuth.ts` but left two residual references that still pull/configure it.

## Changes

1. **`package.json`** — remove the dependency line:
   ```
   "@codetrix-studio/capacitor-google-auth": "^3.4.0-rc.4",
   ```
   (Lovable will regenerate the lockfile automatically.)

2. **`capacitor.config.ts`** — remove the entire `GoogleAuth: { ... }` block from `plugins`. The plugin is no longer installed, so leaving the config does nothing but mislead future readers.

3. **`ANDROID_BUILD.md`** — replace the "Google Sign-In di Android" section that documents the native SDK / `serverClientId` setup with a short note that Google login on Android currently uses Supabase OAuth via the HTTPS bridge (`/auth/native-callback`) + `intent://` deep link, matching the actual code in `src/lib/googleAuth.ts`, `AuthCallback.tsx`, and `NativeAuthBridge.tsx`. Remove the "HAPUS" intent-filter block since those intent-filters are again required for the HTTPS bridge flow.

## Not changed

- `src/lib/googleAuth.ts`, `AuthCallback.tsx`, `NativeAuthBridge.tsx` — already correct for the Supabase OAuth bridge flow.
- No other auth files touched.

## Verification

- `npm install` resolves without `--legacy-peer-deps`.
- `npm run build` succeeds.
- No remaining grep hits for `codetrix` or `GoogleAuth` plugin config.

After merge, user runs locally:
```
git pull
npm install
npm run build
npm run android:sync
```
