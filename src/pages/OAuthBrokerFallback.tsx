import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { isNative, WEB_BASE_URL } from "@/lib/platform";

/**
 * Safety net for stale Android builds that still try to render
 * `/~oauth/initiate` inside the WebView (404). The native app no longer
 * uses the OAuth broker at all (native Google Sign-In handles login), so
 * just bounce back to /auth. On web, forward to the hosted broker.
 */
const OAuthBrokerFallback = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isNative()) {
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