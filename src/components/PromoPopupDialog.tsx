import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { type PromoPopup } from "@/hooks/usePromoPopups";
import { openExternal, isInternalUrl } from "@/utils/openExternal";

interface Props {
  popup: PromoPopup;
  open: boolean;
  onClose: () => void;
  onCtaClick: (which: "primary" | "secondary") => void;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}h ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function Countdown({ endsAt }: { endsAt: string }) {
  const target = new Date(endsAt).getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(i);
  }, []);
  return (
    <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-primary/10 px-3 py-2 backdrop-blur-xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Berakhir dalam</span>
      <span className="font-mono text-sm font-semibold text-primary">{formatCountdown(target - now)}</span>
    </div>
  );
}

const PromoPopupDialog = ({ popup, open, onClose, onCtaClick }: Props) => {
  const navigate = useNavigate();
  const handleCta = (which: "primary" | "secondary") => {
    const url = which === "primary" ? popup.cta_url : popup.cta_secondary_url;
    onCtaClick(which);
    if (url) {
      if (isInternalUrl(url)) {
        // Same-origin or relative → stay inside the SPA / native shell.
        const target = url.startsWith("/") ? url : new URL(url).pathname + new URL(url).search;
        navigate(target);
      } else {
        void openExternal(url);
      }
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="w-[92vw] max-w-sm p-0 overflow-hidden rounded-[28px] border border-white/20 bg-background/70 backdrop-blur-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-20px_40px_rgba(0,0,0,0.05)] [&>button.absolute:not([data-promo-close])]:hidden"
        aria-describedby={undefined}
      >
        <div aria-hidden className="pointer-events-none absolute -top-12 -left-12 h-40 w-40 rounded-full bg-primary/40 blur-3xl animate-pulse" />
        <div aria-hidden className="pointer-events-none absolute -bottom-14 -right-14 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-white/20 via-transparent to-white/5 mix-blend-overlay" />
        <button
          onClick={onClose}
          aria-label="Tutup"
          data-promo-close
          className="absolute top-3 right-3 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur-xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.45),0_6px_16px_rgba(0,0,0,0.25)] transition hover:bg-white/25"
        >
          <X className="h-4 w-4" />
        </button>

        {popup.image_url ? (
          <div className="relative w-full aspect-[5/3] overflow-hidden rounded-t-[28px] bg-muted [transform:translateZ(0)]">
            <img
              src={popup.image_url}
              alt={popup.title}
              loading="eager"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/90 to-transparent" />
          </div>
        ) : (
          <div className="h-2 bg-gradient-to-r from-primary to-yellow-400" />
        )}

        <div className="relative z-10 px-5 pb-5 pt-3 space-y-3">
          <h3 className="text-lg font-bold leading-tight">{popup.title}</h3>
          {popup.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{popup.description}</p>
          )}

          {popup.show_countdown && popup.ends_at && <Countdown endsAt={popup.ends_at} />}

          <div className="flex flex-col gap-2 pt-1">
            {popup.cta_label && (
              <Button
                onClick={() => handleCta("primary")}
                className="w-full h-11 rounded-2xl border border-white/30 bg-gradient-to-br from-primary/90 to-primary/60 text-primary-foreground backdrop-blur-xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_10px_24px_-8px_hsl(var(--primary)/0.6)] hover:opacity-95"
              >
                {popup.cta_label}
              </Button>
            )}
            {popup.cta_secondary_label && (
              <Button
                variant="outline"
                onClick={() => handleCta("secondary")}
                className="w-full h-11 rounded-2xl border-white/25 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.35)]"
              >
                {popup.cta_secondary_label}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromoPopupDialog;