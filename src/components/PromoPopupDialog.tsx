import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { type PromoPopup } from "@/hooks/usePromoPopups";

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
    <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-3 py-2 ring-1 ring-primary/30">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Berakhir dalam</span>
      <span className="font-mono text-sm font-semibold text-primary">{formatCountdown(target - now)}</span>
    </div>
  );
}

const PromoPopupDialog = ({ popup, open, onClose, onCtaClick }: Props) => {
  const handleCta = (which: "primary" | "secondary") => {
    const url = which === "primary" ? popup.cta_url : popup.cta_secondary_url;
    onCtaClick(which);
    if (url) {
      if (/^https?:\/\//.test(url)) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = url;
      }
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden border-white/15 bg-background/90 backdrop-blur-2xl shadow-[0_0_60px_-12px_hsl(var(--primary)/0.4)]"
        aria-describedby={undefined}
      >
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
        >
          <X className="h-4 w-4" />
        </button>

        {popup.image_url ? (
          <div className="relative w-full aspect-[5/3] overflow-hidden bg-muted">
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

        <div className="px-5 pb-5 pt-3 space-y-3">
          <h3 className="text-lg font-bold leading-tight">{popup.title}</h3>
          {popup.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{popup.description}</p>
          )}

          {popup.show_countdown && popup.ends_at && <Countdown endsAt={popup.ends_at} />}

          <div className="flex flex-col gap-2 pt-1">
            {popup.cta_label && (
              <Button
                onClick={() => handleCta("primary")}
                className="w-full bg-gradient-to-r from-red-500 to-yellow-400 text-white shadow-lg hover:opacity-90"
              >
                {popup.cta_label}
              </Button>
            )}
            {popup.cta_secondary_label && (
              <Button
                variant="outline"
                onClick={() => handleCta("secondary")}
                className="w-full"
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