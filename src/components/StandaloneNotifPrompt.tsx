import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { registerWebPushNow } from "@/hooks/useWebPush";

const SEEN_KEY = "pwa_notif_prompt_seen_v1";

/**
 * Shown once per device when the app is opened in standalone (Add-to-Home-Screen)
 * mode but notification permission is still 'default'. Single tap → permission ask.
 */
export default function StandaloneNotifPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!user) return;
    if (typeof Notification === "undefined") return;
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") return;
    } catch {}
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-ignore iOS
      window.navigator.standalone === true;
    if (!standalone) return;
    if (Notification.permission !== "default") return;

    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [user]);

  const mark = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
  };

  const enable = async () => {
    try {
      // Full register chain INSIDE the user tap — required on iOS PWA.
      const result = await registerWebPushNow();
      if (result.ok) {
        toast.success("Notifikasi aktif", {
          description: "Perangkat ini terdaftar untuk update di layar kunci & badge ikon.",
        });
        try { new Notification("Notifikasi aktif", { body: "Sahabat Stroban siap memberi update." }); } catch {}
      } else if (result.status === "denied") {
        toast("Izin notifikasi belum diberikan", {
          description: "Aktifkan dari Pengaturan iPhone → STROBAN, lalu buka kembali aplikasi.",
        });
      } else {
        toast.error("Gagal mendaftarkan perangkat", { description: result.reason || "Coba lagi dari menu PWA Settings." });
      }
    } finally {
      mark();
      setOpen(false);
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
          <Button onClick={enable} size="lg" className="w-full">
            <Bell className="h-4 w-4 mr-2" /> Aktifkan Sekarang
          </Button>
          <Button onClick={dismiss} variant="ghost" size="sm" className="w-full">
            <X className="h-4 w-4 mr-2" /> Nanti saja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}