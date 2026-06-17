import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { useOverlayQueue } from "@/contexts/OverlayQueueContext";

/**
 * Minimal GDPR-style cookie consent banner.
 * On "Setuju" → sets localStorage + loads GA4 immediately.
 * On "Tolak"  → stores denial, GA4 is never loaded.
 */
export default function CookieConsentBanner() {
  const [needsConsent, setNeedsConsent] = useState(false);
  const { request, release, isActive } = useOverlayQueue();

  useEffect(() => {
    const v = localStorage.getItem("cookie_consent");
    if (!v) setNeedsConsent(true);
  }, []);

  useEffect(() => {
    if (needsConsent) {
      request("cookie");
      return () => release("cookie");
    }
  }, [needsConsent, request, release]);

  const show = needsConsent && isActive("cookie");

  const accept = () => {
    localStorage.setItem("cookie_consent", "granted");
    try {
      (window as any).gtag?.("consent", "update", { analytics_storage: "granted" });
      if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
        const s = document.createElement("script");
        s.async = true;
        s.src = "https://www.googletagmanager.com/gtag/js?id=G-R1H7RQCXJQ";
        document.head.appendChild(s);
        (window as any).gtag?.("js", new Date());
        (window as any).gtag?.("config", "G-R1H7RQCXJQ", {
          anonymize_ip: true,
          send_page_view: false,
        });
        // Fire first page_view for current path (SPA tracker takes over after this)
        (window as any).gtag?.("event", "page_view", {
          page_path: window.location.pathname + window.location.search,
          page_location: window.location.href,
          page_title: document.title,
        });
      }
    } catch {}
    setNeedsConsent(false);
    release("cookie");
  };

  const reject = () => {
    localStorage.setItem("cookie_consent", "denied");
    setNeedsConsent(false);
    release("cookie");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[60] animate-in slide-in-from-bottom-4">
      <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Cookie className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Kami menggunakan cookies</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cookies analitik membantu kami memahami cara Anda menggunakan situs ini.
              Anda bisa menolak tanpa mengganggu fungsi utama.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={reject} className="flex-1">
                Tolak
              </Button>
              <Button size="sm" onClick={accept} className="flex-1">
                Setuju
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}