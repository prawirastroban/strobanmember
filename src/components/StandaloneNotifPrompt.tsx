import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { registerWebPushNow } from "@/hooks/useWebPush";

const SEEN_KEY = "pwa_notif_prompt_seen_v1";
const REGISTERED_KEY = "pwa_notif_registered_v1";

/**
 * Shown once per device when the app is opened in standalone (Add-to-Home-Screen)
 * mode but notification permission is still 'default'. Single tap → permission ask.
 */
export default function StandaloneNotifPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!user) return;
    if (typeof Notification === "undefined") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-ignore iOS
      window.navigator.standalone === true;
    if (!standalone) return;

    // Branch A — permission already granted on this device but no token yet
    // (e.g. user reinstalled PWA or installed on a second device after granting
    // before). Silently register without showing the dialog.
    if (Notification.permission === "granted") {
      try {
        if (localStorage.getItem(REGISTERED_KEY) === "1") return;
      } catch {}
      (async () => {
        const result = await registerWebPushNow();
        if (result.ok) {
          try { localStorage.setItem(REGISTERED_KEY, "1"); } catch {}
          toast.success("Perangkat berhasil terhubung", {
            description: "Siap menerima notifikasi di layar kunci & badge ikon.",
          });
        }
      })();
      return;
    }

    // Branch B — first install, permission still 'default'. Show the gesture
    // dialog so the user can grant permission with a single tap.
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") return;
    } catch {}
    if (Notification.permission !== "default") return;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [user]);

  const mark = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
  };

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Full register chain INSIDE the user tap — required on iOS PWA.
      const result = await registerWebPushNow();
      if (result.ok) {
        try { localStorage.setItem(REGISTERED_KEY, "1"); } catch {}
        toast.success("Notifikasi aktif", {
          description: "Perangkat ini terdaftar untuk update di layar kunci & badge ikon.",
        });
        try { new Notification("Notifikasi aktif", { body: "Sahabat Stroban siap memberi update." }); } catch {}
        mark();
        setOpen(false);
      } else if (result.status === "denied") {
        toast("Izin notifikasi belum diberikan", {
          description: "Aktifkan dari Pengaturan iPhone → STROBAN, lalu buka kembali aplikasi.",
        });
        // Keep dialog open so the user can retry after changing settings.
      } else {
        toast.error("Gagal mendaftarkan perangkat", { description: result.reason || "Coba lagi dari menu PWA Settings." });
        // Keep dialog open so the user can retry.
      }
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => { mark(); setOpen(false); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Bell className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center">Aktifkan Notifikasi</DialogTitle>
          <DialogDescription className="text-center">
            Dapatkan update real-time langsung di layar kunci & badge angka di ikon aplikasi, seperti WhatsApp atau YouTube.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={enable} size="lg" className="w-full" disabled={busy}>
            <Bell className="h-4 w-4 mr-2" /> {busy ? "Mengaktifkan..." : "Aktifkan Sekarang"}
          </Button>
          <Button onClick={dismiss} variant="ghost" size="sm" className="w-full" disabled={busy}>
            <X className="h-4 w-4 mr-2" /> Nanti saja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}