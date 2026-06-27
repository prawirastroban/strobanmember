import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { isNative, WEB_BASE_URL } from "@/lib/platform";
import { openExternal } from "@/utils/openExternal";
import {
  NATIVE_AUTH_CALLBACK_URL,
  NATIVE_AUTH_NEXT_KEY,
  NATIVE_AUTH_STATE_KEY,
} from "@/lib/googleAuth";

function createState() {
  try {
    return [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Safety net for stale Android builds that still navigate the WebView to
 * `/~oauth/initiate`. That route exists only on the hosted web origin, so the
 * native app must forward it to the hosted broker instead of rendering 404.
 */
const OAuthBrokerFallback = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (isNative()) {
      const state = params.get("state") || createState();
      params.set("state", state);
      params.set("redirect_uri", NATIVE_AUTH_CALLBACK_URL);
      if (!params.get("provider")) params.set("provider", "google");

      try {
        localStorage.setItem(NATIVE_AUTH_STATE_KEY, state);
        const next = params.get("next") || sessionStorage.getItem("lastVisitedPath") || "/";
        if (next.startsWith("/") && !next.startsWith("//")) {
          localStorage.setItem(NATIVE_AUTH_NEXT_KEY, next);
        }
      } catch {
        /* ignore storage errors */
      }

      void openExternal(`${WEB_BASE_URL}${location.pathname}?${params.toString()}`);
      navigate("/auth", { replace: true });
      return;
    }

    window.location.replace(`${WEB_BASE_URL}${location.pathname}${location.search}`);
  }, [location.pathname, location.search, navigate]);

  return (
    <div className="min-h-[calc(var(--vh)*100)] flex flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Membuka login Google...</p>
    </div>
  );
};

export default OAuthBrokerFallback;