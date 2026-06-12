import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { useAppVersion } from "@/hooks/useAppVersion";
import { hardReload } from "@/lib/appVersion";

const DISMISS_KEY = "version_soft_dismissed_for";

const VersionGate = () => {
  const { current, latest, releaseNotes, mismatch, blocking } = useAppVersion();
  const [dismissedFor, setDismissedFor] = useState<string | null>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // If a brand-new latest arrives, reset the dismiss flag.
    if (latest && dismissedFor && dismissedFor !== latest) {
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {
        /* ignore */
      }
      setDismissedFor(null);
    }
  }, [latest, dismissedFor]);

  const doUpdate = async () => {
    setUpdating(true);
    await hardReload(latest || undefined);
  };

  const dismiss = () => {
    if (!latest) return;
    try {
      localStorage.setItem(DISMISS_KEY, latest);
    } catch {
      /* ignore */
    }
    setDismissedFor(latest);
  };

  // Blocking modal (force_refresh or below min supported version)
  if (blocking) {
    return (
      <Dialog open modal>
        <DialogContent
          className="max-w-md border-white/15 bg-background/80 backdrop-blur-2xl shadow-2xl [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-500 ring-1 ring-red-500/30">
              <Sparkles className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Versi Baru Tersedia</DialogTitle>
            <DialogDescription className="text-center">
              Aplikasi harus diperbarui untuk melanjutkan. Versi Anda{" "}
              <span className="font-mono">{current}</span>, terbaru{" "}
              <span className="font-mono">{latest}</span>.
            </DialogDescription>
          </DialogHeader>
          {releaseNotes && (
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
              {releaseNotes}
            </div>
          )}
          <Button
            onClick={doUpdate}
            disabled={updating}
            className="w-full bg-gradient-to-r from-red-500 to-yellow-400 text-white hover:opacity-90"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${updating ? "animate-spin" : ""}`} />
            {updating ? "Memperbarui..." : "Perbarui Sekarang"}
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Soft banner (mismatch, dismissable)
  if (!mismatch || dismissedFor === latest) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 z-[60] -translate-x-1/2 px-4 w-full max-w-md animate-in fade-in slide-in-from-bottom-3">
      <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-background/80 px-4 py-3 shadow-xl backdrop-blur-xl">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400/20 text-yellow-500 ring-1 ring-yellow-400/30">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Versi baru tersedia</p>
          <p className="text-xs text-muted-foreground truncate">
            {current} → {latest}
          </p>
        </div>
        <Button
          size="sm"
          onClick={doUpdate}
          disabled={updating}
          className="h-8 bg-gradient-to-r from-red-500 to-yellow-400 text-white hover:opacity-90"
        >
          <RefreshCw className={`mr-1 h-3 w-3 ${updating ? "animate-spin" : ""}`} />
          Muat Ulang
        </Button>
        <button
          onClick={dismiss}
          aria-label="Tutup"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default VersionGate;