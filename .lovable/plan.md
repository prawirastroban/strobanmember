## Fix Android Google OAuth deep-link return to app

### 1. Update `public/.well-known/assetlinks.json`

Replace both placeholder fingerprints with the real key so Android will auto-verify App Links for `www.bengkelstroban.com` and open the app directly instead of leaving the user stranded on `/auth/native-callback`.

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.get_login_creds"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.bengkelstroban.app",
      "sha256_cert_fingerprints": [
        "EF:20:2C:D8:0C:9A:DE:4B:1D:17:DB:51:CB:8B:97:E1:E0:61:DC:22:6A:D8:25:4F:2B:86:51:0A:32:5A:6C:9D"
      ]
    }
  }
]
```

Verify after deploy that `https://www.bengkelstroban.com/.well-known/assetlinks.json` returns HTTP 200 with `Content-Type: application/json` (Lovable hosting already serves `public/` at the root — no extra config needed).

### 2. Harden `src/pages/AuthCallback.tsx` fallback UX

The existing intent redirect fires once and silently fails when the App Link is not yet verified or when the user is in a browser that blocks `intent://`. Improvements:

- Trigger the `intent://` handoff immediately (already done) **and** in parallel try the custom scheme `com.bengkelstroban.app://auth/native-callback?...` after 800 ms (some Android browsers only honor the custom scheme).
- After ~1.5 s with no app resume, show a prominent fallback UI:
  - Primary button "Buka Aplikasi Stroban" → `intent://` URL (already present, keep visible from the start rather than only on Android UA check — remove the `isAndroidBrowser` gate so users on non-standard UAs also get it).
  - Secondary link "Buka via skema aplikasi" → `com.bengkelstroban.app://auth/native-callback?...` for browsers that strip intent URLs.
  - Helper text: "Jika aplikasi tidak terbuka otomatis, ketuk tombol di atas. Pastikan aplikasi Stroban sudah terinstall."
- Detect success: listen for `visibilitychange`; if the tab becomes hidden within 3 s of the intent redirect, assume the app opened and hide the fallback.
- Keep the existing session-hydration path as-is so that if the user stays in the browser (no app installed), they still get logged in on web.

### 3. Documentation touch-up

Update `ANDROID_BUILD.md` to note:
- The single production SHA-256 now lives in `assetlinks.json`.
- Reminder that after any signing-key rotation the fingerprint list must be re-added and Play Console App Signing key SHA (if different) appended.
- Reminder to run `adb shell pm verify-app-links --re-verify com.bengkelstroban.app` after install to force Android to re-check `assetlinks.json`.

### Out of scope (already correct, no change needed)
- `NativeAuthBridge.tsx` — already handles `appUrlOpen` for both `code` and token grants.
- `googleAuth.ts` — already redirects to the HTTPS bridge on native.
- Supabase redirect allowlist — user confirmed previously.

### Technical notes
- No new dependencies.
- Only 2 files change: `public/.well-known/assetlinks.json`, `src/pages/AuthCallback.tsx`. Plus a short doc edit in `ANDROID_BUILD.md`.
- No DB / edge-function changes.
- After deploying, user must reinstall (or `pm verify-app-links --re-verify`) the app once so Android re-fetches `assetlinks.json` and marks the domain as verified.
