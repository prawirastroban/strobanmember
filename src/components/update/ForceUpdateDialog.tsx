import { useEffect } from "react";
import { AlertOctagon, Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVersionCheck } from "@/contexts/VersionCheckContext";
import { formatReleaseDate } from "@/services/versionRegistry";
import { isNative } from "@/lib/platform";

/**
 * Phase 6 — Force Update Dialog.
 *
 * Non-dismissible modal: no outside-click, no Escape, no swipe-back, no
 * Android hardware back-button close. Countdown from 10s → 0, then the
 * host runs the smart update.
 */
interface ForceUpdateDialogProps {
  open: boolean;
  updating: boolean;
  onStart: () => void;
  onClose?: () => void;
}

export const ForceUpdateDialog = ({
  open,
  updating,
  onStart,
  onClose,
}: ForceUpdateDialogProps) => {
  const native = isNative();
  const {
    localVersion,
    localBuild,
    serverVersion,
    serverBuild,
    releaseNotes,
    releaseDate,
    countdownActive,
    countdownRemaining,
    startCountdown,
  } = useVersionCheck();

  // Auto-start countdown when the dialog opens.
  useEffect(() => {
    if (!native && open && !updating && !countdownActive && countdownRemaining === 0) {
      startCountdown(10);
    }
  }, [native, open, updating, countdownActive, countdownRemaining, startCountdown]);

  // When countdown finishes, kick off the update.
  useEffect(() => {
    if (
      open &&
      !updating &&
      !countdownActive &&
      countdownRemaining === 0
    ) {
      // small guard: only trigger once countdown has actually elapsed
      // (initial mount also has countdownRemaining===0, but startCountdown above
      // will have set it to 10 first)
    }
  }, [open, updating, countdownActive, countdownRemaining]);

  // Block Escape key & Android back button.
  useEffect(() => {
    if (!open || onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    // Capacitor hardware back button (no-op while force update is open).
    let removeBack: (() => void) | null = null;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        const sub = await App.addListener("backButton", () => {
          /* swallow */
        });
        removeBack = () => void sub.remove();
      } catch { /* ignore */ }
    })();
    return () => {
      window.removeEventListener("keydown", onKey, true);
      removeBack?.();
    };
  }, [open, onClose]);

  // Trigger onStart exactly once when countdown transitions to 0 and dialog was active.
  const shouldStart =
    !native && open && !updating && !countdownActive && countdownRemaining === 0;
  useEffect(() => {
    if (shouldStart) {
      // Delay a tick so the "0" state is visible.
      const t = window.setTimeout(() => onStart(), 250);
      return () => window.clearTimeout(t);
    }
  }, [shouldStart, onStart]);

  const notes = (releaseNotes ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*•]\s?/, "").trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="max-w-md sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary"
            >
              <AlertOctagon className="h-6 w-6" aria-hidden />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base">Versi baru tersedia</DialogTitle>
              <DialogDescription>
                Perbarui untuk mendapatkan fitur terbaru.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Versi Anda
            </div>
            <div className="mt-0.5 font-medium">v{localVersion}</div>
            <div className="text-[10px] text-muted-foreground">#{localBuild}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Versi Baru
            </div>
            <div className="mt-0.5 font-medium">v{serverVersion ?? "—"}</div>
            <div className="text-[10px] text-muted-foreground">
              #{serverBuild ?? "—"} · {formatReleaseDate(releaseDate)}
            </div>
          </div>
        </div>

        {notes.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-foreground">
            {notes.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                />
                <span className="leading-snug">{line}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-center">
          {native ? (
            <p className="text-sm text-muted-foreground">Perbarui Stroban melalui Google Play, lalu buka kembali aplikasi.</p>
          ) : updating ? (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memperbarui aplikasi…
            </div>
          ) : countdownActive || countdownRemaining > 0 ? (
            <>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Update otomatis dalam
              </div>
              <div className="mt-1 text-3xl font-bold text-primary">
                {countdownRemaining}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Mempersiapkan…</div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>Nanti</Button>
          )}
          <Button
            onClick={onStart}
            disabled={updating}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {native ? "Perbarui di Google Play" : "Update Sekarang"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForceUpdateDialog;