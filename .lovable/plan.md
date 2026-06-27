## Phase 2 — Android Native Improvement

Scope: backend logic only. No UI redesign, no color/layout/branding changes.

### 1. Fix Android Login (Capacitor session persistence)
**Problem**: On `capacitor://localhost`, Supabase auth state can be brittle because (a) `emailRedirectTo: window.location.origin` resolves to `capacitor://localhost` which is invalid for email confirmation links, and (b) some Android WebView builds throttle `localStorage` during cold start, racing `getSession()`.

**Changes**:
- `src/integrations/supabase/client.ts`: leave file untouched (auto-gen). Instead introduce `src/lib/platform.ts` exporting `isNative()`, `isAndroid()`, `webBaseUrl()` returning `https://www.bengkelstroban.com` on native, `window.location.origin` on web.
- `src/contexts/AuthContext.tsx`: replace every `window.location.origin` used as `emailRedirectTo` / OAuth `redirectTo` with `webBaseUrl()` so email & OAuth callbacks land on the published web domain (which then bridges back via deep-link Universal Link — keep deep-link config note in README).
- `src/pages/Auth.tsx` & `ResetPassword.tsx`: same swap for `redirectTo`.
- Verify `persistSession: true` + `autoRefreshToken: true` (already set). Add `flowType: "pkce"` recommendation noted only — actual edit deferred (avoid breaking web flow if not desired).
- Logout: ensure `signOut()` clears `localStorage` keys `sb-*` defensively on native to prevent stale token rehydrate.

### 2. Internal Navigation Cleanup
Audit & migrate to React Router. Files containing `window.location.href` / `window.open` / raw `<a href="/internal">`:
- Internal navigations → use `useNavigate()` / `<Link>`:
  - `src/components/Footer.tsx`, `Navbar.tsx`, `DesktopSidebar.tsx`, `MobileNav.tsx`, `Hero.tsx`, `LoginDialog.tsx`, `CookieConsentBanner.tsx`, `PromoPopupDialog.tsx`, `WhatsAppRequiredGate.tsx`
  - `src/pages/Profile.tsx`, `MyBooking.tsx`, `ManualPayment.tsx`, `Referral.tsx`, `ServiceProgress.tsx`, `PublicBookingTracker.tsx`
  - `src/components/admin/*` internal route links
- Keep `window.location.href` only for: hard reload (`appVersion.ts`), error boundary recovery (`AppErrorBoundary.tsx`), auth provider redirects to OAuth, and analytics tracker reads. These are intentionally full reloads.

### 3. External Link Handler
- Add `@capacitor/browser` dependency.
- Create `src/utils/openExternal.ts`:
  ```ts
  export async function openExternal(url: string) { /* native → Browser.open, web → anchor click */ }
  export function isInternalUrl(url: string): boolean // matches bengkelstroban.com hosts
  ```
- Refactor `src/lib/whatsapp.ts` `openWhatsApp` to delegate to `openExternal`.
- Replace all WhatsApp/Maps/Instagram/Facebook/YouTube anchor-clicks across the codebase to call `openExternal()` (keep visible `<a>` for accessibility, just intercept `onClick` on native).

### 4. Hardware Back Button
- Add `@capacitor/app` dependency.
- New `src/components/AndroidBackHandler.tsx` mounted inside `<BrowserRouter>` in `App.tsx`:
  - Listens to `App.addListener('backButton')`.
  - If `location.pathname !== "/"` → `navigate(-1)`.
  - If at `/` → show AlertDialog "Keluar dari Stroban?" with Cancel / Keluar (calls `App.exitApp()`).

### 5. Status Bar / Safe Area
Already mostly handled. Add audit checks:
- `CookieConsentBanner.tsx`: ensure bottom offset = `calc(env(safe-area-inset-bottom) + 5rem)` on mobile so it sits above `BottomNav` (h-16). Verify with existing class — patch if missing.
- No other UI changes.

### 6. Splash Screen
- `capacitor.config.ts`: update SplashScreen plugin:
  ```ts
  SplashScreen: { launchShowDuration: 1000, backgroundColor: '#D50000',
    showSpinner: false, androidScaleType: 'CENTER_CROP', splashFullScreen: true,
    splashImmersive: true, fadeOutDuration: 300 }
  ```
- Document in `ANDROID_BUILD.md`: place `splash.png` in `android/app/src/main/res/drawable*`.

### 7. Icon Preparation (structure only)
- Update `ANDROID_BUILD.md` with required directories:
  ```
  android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png
  android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml (adaptive)
  android/app/src/main/res/drawable/ic_launcher_monochrome.xml
  ```
- No image generation. No file changes inside `android/` (folder lives only on user's machine after `npx cap add android`).

### 8. Centralized Version Config
- New `src/config/version.ts`:
  ```ts
  export const APP_VERSION = "1.0.0";
  export const APP_BUILD_NUMBER = 1;
  export const MIN_SUPPORTED_VERSION = "1.0.0";
  ```
- Re-export from `src/lib/appVersion.ts` so existing build-time `__APP_VERSION__` flow remains, but native reads from `version.ts`.
- Update `scripts/sync-android-version.mjs` to read `src/config/version.ts` instead of computing date-based version, keeping date fallback if file missing.

### 9. Update Checker (scaffold only, no runtime)
- New `src/services/updateChecker.ts`:
  ```ts
  export interface UpdateInfo { current: string; latest: string; mustUpdate: boolean; url?: string; }
  export async function checkForUpdate(): Promise<UpdateInfo | null> { /* TODO compare with app_settings */ return null; }
  ```
- Not wired anywhere. Existing `VersionGate` continues to work.

### 10. Cleanup
- Remove dead helpers `openExternalTab` / `navigateExternalTab` in `whatsapp.ts` after migrating callers to `openExternal`.
- Remove duplicate auth-fallback try/catch branches superseded by new `signIn` retry path.
- Strip leftover `window.open(` calls that only existed for the old WhatsApp escape-iframe trick.

### Technical Notes
- No DB schema change.
- No new edge functions.
- New deps: `@capacitor/browser`, `@capacitor/app` (native plugins; auto-bridged after `npx cap sync`).
- User must run `npm i && npx cap sync android` after pull.
- All web behavior preserved: `openExternal` falls back to anchor click on web; back-handler no-op on web; OAuth still uses `window.location.origin` on web, `https://www.bengkelstroban.com` on native (requires Supabase redirect-URL whitelist already includes both — confirm before deploy).

### Files Modified Summary
| File | Reason |
|---|---|
| `src/lib/platform.ts` (new) | native detection + canonical web base url |
| `src/utils/openExternal.ts` (new) | unified external link opener |
| `src/components/AndroidBackHandler.tsx` (new) | hardware back-button UX |
| `src/services/updateChecker.ts` (new) | OTA scaffold |
| `src/config/version.ts` (new) | central version |
| `src/contexts/AuthContext.tsx` | redirect URLs + native logout cleanup |
| `src/pages/Auth.tsx`, `ResetPassword.tsx` | redirect URLs |
| `src/App.tsx` | mount `AndroidBackHandler` |
| `src/lib/whatsapp.ts` | delegate to `openExternal`; drop dead helpers |
| ~20 components/pages | swap internal `window.location.href` / `<a href>` → `navigate()` / `<Link>` |
| `capacitor.config.ts` | splash background `#D50000`, 1000ms, fade |
| `scripts/sync-android-version.mjs` | read `src/config/version.ts` |
| `ANDROID_BUILD.md` | document icon dirs + splash assets |
| `package.json` | add `@capacitor/browser`, `@capacitor/app` |

### Recommendations (not implemented)
1. Add deep-link `assetlinks.json` at `https://www.bengkelstroban.com/.well-known/assetlinks.json` so OAuth/email-confirm returns to the app.
2. Migrate Supabase auth `flowType: "pkce"` once OAuth callback page is hardened.
3. Enable Android `usesCleartextTraffic="false"` audit + ProGuard rules.
