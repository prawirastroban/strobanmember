import { useEffect, useRef } from "react";

// siteKey publik Cloudflare Turnstile (boleh di code)
export const TURNSTILE_SITE_KEY = "0x4AAAAAADPlk023zm9uRIYq";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

function ensureScript(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (code: string) => void;
  theme?: "light" | "dark" | "auto";
  className?: string;
}

export const Turnstile = ({ onVerify, onExpire, onError, theme = "auto", className }: TurnstileProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let verified = false;
    // Safety net: if widget can't render or domain isn't whitelisted (e.g. preview),
    // signal "unavailable" so caller can fall back gracefully instead of locking the user out.
    const unavailableTimer = window.setTimeout(() => {
      if (!cancelled && !verified) onError?.("unavailable");
    }, 6000);
    ensureScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme,
          callback: (token: string) => { verified = true; onVerify(token); },
          "expired-callback": () => onExpire?.(),
          "error-callback": (code?: string) => {
            onExpire?.();
            onError?.(code || "error");
          },
        });
      } catch {
        /* ignore double-render */
      }
    });
    return () => {
      cancelled = true;
      window.clearTimeout(unavailableTimer);
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} />;
};

export default Turnstile;