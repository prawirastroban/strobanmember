import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMissingWhatsApp } from "@/hooks/useMissingWhatsApp";

const DISMISS_KEY = "wa_reminder_dismissed_until";
const HIDDEN_PREFIXES = ["/auth", "/reset-password", "/dashboard", "/admin", "/review", "/profile"];

export default function WhatsAppReminderBanner() {
  const { isMissing } = useMissingWhatsApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      setDismissed(until > Date.now());
    } catch {
      setDismissed(false);
    }
  }, [location.pathname]);

  if (!isMissing || dismissed) return null;
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className="sticky top-0 z-40 w-full border-b border-[#ff2b2b]/40 bg-gradient-to-r from-[#ff2b2b]/15 via-background/80 to-[#ff2b2b]/10 backdrop-blur-md">
      <div className="container mx-auto px-3 py-2 flex items-center gap-2 sm:gap-3">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#25D366]/15 flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-[#25D366]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] sm:text-sm font-semibold leading-tight">
            Lengkapi nomor WhatsApp Anda
          </p>
          <p className="text-[10.5px] sm:text-xs text-muted-foreground leading-tight hidden sm:block">
            Agar bisa menerima konfirmasi booking, reminder service & reset password lewat WhatsApp.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/profile#phone")}
          className="h-8 rounded-full text-[11px] sm:text-xs px-3 sm:px-4 font-semibold bg-[#ff2b2b] hover:bg-[#ff2b2b]/90 text-white shadow-[0_0_14px_rgba(255,43,43,0.45)]"
        >
          Isi Sekarang
        </Button>
        <button
          onClick={handleDismiss}
          aria-label="Tutup"
          className="h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}