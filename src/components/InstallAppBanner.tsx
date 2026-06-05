import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Download, X, Share, Plus } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useBranding } from "@/hooks/useBranding";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SHOWN_KEY = "pwa_install_banner_shown";
const SHOW_DELAY_MS = 5000;
const HIDDEN_PATH_PREFIXES = ["/auth", "/reset-password", "/payment/manual", "/invoice/"];

const InstallAppBanner = () => {
  const location = useLocation();
  const { show, canPrompt, isIOS, promptInstall } = useInstallPrompt();
  const { logoLight, brandName } = useBranding();
  const [visible, setVisible] = useState(false);
  const [iosDialogOpen, setIosDialogOpen] = useState(false);

  const pathHidden = HIDDEN_PATH_PREFIXES.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (!show || pathHidden) {
      setVisible(false);
      return;
    }
    try {
      if (localStorage.getItem(SHOWN_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    // Only show when we can actually do something (native prompt or iOS instructions)
    if (!canPrompt && !isIOS) return;

    const t = setTimeout(() => {
      setVisible(true);
      try {
        localStorage.setItem(SHOWN_KEY, "1");
      } catch {
        /* ignore */
      }
    }, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [show, canPrompt, isIOS, pathHidden]);

  const dismiss = () => {
    try {
      localStorage.setItem(SHOWN_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const handleInstall = async () => {
    if (isIOS && !canPrompt) {
      setIosDialogOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      setVisible(false);
    } else {
      dismiss();
    }
  };

  if (!visible) {
    return (
      <Dialog open={iosDialogOpen} onOpenChange={setIosDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install di iPhone / iPad</DialogTitle>
            <DialogDescription>
              Tambahkan {brandName} ke layar utama dalam 3 langkah:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">1.</span>
              <span className="flex items-center gap-1">
                Tap tombol <Share className="inline h-4 w-4" /> <b>Bagikan</b> di Safari.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">2.</span>
              <span className="flex items-center gap-1">
                Pilih <Plus className="inline h-4 w-4" /> <b>Tambahkan ke Layar Utama</b>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">3.</span>
              <span>Tap <b>Tambah</b>, selesai!</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <div
        className="fixed z-40 left-0 right-0 bottom-16 md:bottom-4 md:left-auto md:right-4 md:w-[340px] px-3 md:px-0 animate-in slide-in-from-bottom-4 fade-in duration-300"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="relative rounded-2xl border border-primary/30 bg-background/85 backdrop-blur-xl shadow-[0_8px_32px_rgba(255,43,43,0.25)] p-3 flex items-center gap-3 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <img
            src={logoLight}
            alt={brandName}
            className="relative h-10 w-10 rounded-xl object-contain bg-white/90 p-1 shrink-0"
          />
          <div className="relative flex-1 min-w-0">
            <p className="text-sm font-bold truncate">Install {brandName}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Akses lebih cepat & notifikasi langsung
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="relative shrink-0 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 shadow-[0_0_16px_rgba(255,43,43,0.5)] hover:scale-[1.03] transition-transform"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </button>
          <button
            onClick={dismiss}
            aria-label="Tutup"
            className="relative shrink-0 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={iosDialogOpen} onOpenChange={setIosDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install di iPhone / iPad</DialogTitle>
            <DialogDescription>
              Tambahkan {brandName} ke layar utama dalam 3 langkah:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">1.</span>
              <span className="flex items-center gap-1">
                Tap tombol <Share className="inline h-4 w-4" /> <b>Bagikan</b> di Safari.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">2.</span>
              <span className="flex items-center gap-1">
                Pilih <Plus className="inline h-4 w-4" /> <b>Tambahkan ke Layar Utama</b>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">3.</span>
              <span>Tap <b>Tambah</b>, selesai!</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallAppBanner;