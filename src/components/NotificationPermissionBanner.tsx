import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useWebPush, isWebPushConfigured } from "@/hooks/useWebPush";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "notif_permission_dismissed_v1";

/**
 * Banner ringan yang meminta izin notifikasi handphone.
 * - Di native (Capacitor): pakai PushNotifications API, sudah ditangani di hook.
 * - Di web/PWA: pakai Notification.requestPermission() + simpan token web ke push_tokens.
 */
export default function NotificationPermissionBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSupported: nativeSupported, isRegistered, registerNotifications } = usePushNotifications();
  useWebPush();
  const [webPermission, setWebPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") setWebPermission(Notification.permission);
  }, []);

  if (!user || dismissed) return null;

  const isNative = Capacitor.isNativePlatform();
  const needsPrompt = isNative
    ? nativeSupported && !isRegistered
    : webPermission === "default";

  if (!needsPrompt) return null;

  const handleEnable = async () => {
    setBusy(true);
    try {
      if (isNative) {
        await registerNotifications();
        toast({ title: "Notifikasi diaktifkan", description: "Anda akan menerima update status booking di handphone." });
      } else {
        if (typeof Notification === "undefined") {
          toast({ variant: "destructive", title: "Tidak didukung", description: "Browser ini tidak mendukung notifikasi." });
          return;
        }
        const perm = await Notification.requestPermission();
        setWebPermission(perm);
        if (perm === "granted") {
          if (!isWebPushConfigured()) {
            toast({ title: "Notifikasi browser aktif", description: "Anda akan menerima notifikasi saat tab terbuka." });
          } else {
            toast({ title: "Notifikasi diaktifkan", description: "Anda akan menerima notifikasi di browser ini." });
          }
          new Notification("Notifikasi aktif", { body: "Anda akan menerima update penting dari Sahabat Stroban." });
        } else {
          toast({ variant: "destructive", title: "Izin ditolak", description: "Aktifkan dari pengaturan browser kapan saja." });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  };

  return (
    <div className="relative mx-auto mb-3 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 shadow-sm backdrop-blur">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Bell className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Aktifkan notifikasi handphone</p>
        <p className="text-xs text-muted-foreground leading-snug">
          Dapatkan update real-time setiap perubahan status booking Anda.
        </p>
      </div>
      <Button size="sm" onClick={handleEnable} disabled={busy} className="shrink-0">
        {busy ? "..." : "Aktifkan"}
      </Button>
      <button
        onClick={handleDismiss}
        aria-label="Tutup"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}