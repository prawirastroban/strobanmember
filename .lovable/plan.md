## Situation

Redirect URL allowlist and Google provider settings live in the Lovable Cloud auth configuration UI, not in a tool I can call from here. The available `configure_auth` tool only toggles signup/auto-confirm/HIBP flags, and `configure_social_auth` only enables/disables providers — neither can add `com.bengkelstroban.app://auth/native-callback` to the redirect allowlist or read back the current Site URL / redirect list / Google client settings.

So this step has to be done by you in the backend UI. I will not be able to "confirm" the resulting values from my side either — those screens aren't exposed to me.

## What you need to do (one-time, ~2 minutes)

1. Open the backend:

<presentation-actions>
<presentation-open-backend>Open Backend</presentation-open-backend>
</presentation-actions>

2. Go to **Users → Auth Settings → URL Configuration**.
3. Under **Redirect URLs**, click **Add URL** and paste exactly:
   ```
   com.bengkelstroban.app://auth/native-callback
   ```
   Also make sure these are still present (add any that are missing, do not remove anything):
   ```
   https://www.bengkelstroban.com/**
   https://bengkelstroban.com/**
   https://strobanmember.lovable.app/**
   https://id-preview--b619a7db-c469-4218-9af2-5982392d5c82.lovable.app/**
   ```
4. Leave **Site URL** as `https://www.bengkelstroban.com`.
5. Go to **Sign In Methods → Google**. Confirm Google is **enabled**. If you are using the Lovable-managed Google client (default), no client ID/secret is needed and the custom scheme is automatically allowed once it is in the redirect list above. If you switched to your own Google OAuth client, open Google Cloud Console → that OAuth client → **Authorized redirect URIs** and make sure the Supabase callback URL shown in the Google provider panel is listed there (custom schemes are not added in Google Console — they are handled by Supabase's redirect allowlist you just updated).

## After you save

Reply here with a screenshot (or just "done") and I will:

- Do a native login smoke test plan against `com.bengkelstroban.app://auth/native-callback`.
- If anything is still off (e.g. Google returns `redirect_uri_mismatch` or the app doesn't reopen), diagnose from the OAuth error and patch `googleAuth.ts` / `NativeAuthBridge.tsx` accordingly.

## Why I can't do this for you

The redirect-URL allowlist and Google client fields are only editable through the Lovable Cloud auth UI. The programmatic tools I have (`configure_auth`, `configure_social_auth`) don't expose those fields, and there is no read-only tool that returns the current Site URL / redirect list / Google client ID for me to quote back to you.
