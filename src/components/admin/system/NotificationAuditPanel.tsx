import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Smartphone, Apple, Globe, Loader2, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface Stats {
  total: number;
  android: number;
  ios: number;
  web: number;
  fbConnected: boolean;
  fcmConfigured: boolean;
  lastSent: string | null;
  lastSuccess: string | null;
  lastFailed: string | null;
}

const NotificationAuditPanel = () => {
  const { isOwner } = useUserRole();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const detectFirebaseSW = async (): Promise<boolean> => {
    try {
      if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.some((r) =>
        [r.active?.scriptURL, r.installing?.scriptURL, r.waiting?.scriptURL]
          .filter(Boolean)
          .some((u) => (u as string).includes("firebase-messaging-sw")),
      );
    } catch {
      return false;
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const fbConnected = await detectFirebaseSW();
      const { data, error } = await supabase.functions.invoke("notification-audit", {
        body: { action: "stats" },
      });
      if (error || !data?.ok) {
        // Non-owner / unauth → still render device-side info
        setStats({
          total: 0, android: 0, ios: 0, web: 0,
          fbConnected, fcmConfigured: false,
          lastSent: null, lastSuccess: null, lastFailed: null,
        });
        return;
      }
      setStats({
        total: data.counts?.total ?? 0,
        android: data.counts?.android ?? 0,
        ios: data.counts?.ios ?? 0,
        web: data.counts?.web ?? 0,
        fbConnected,
        fcmConfigured: !!data.fcm_configured,
        lastSent: data.last_sent ?? null,
        lastSuccess: data.last_success ?? null,
        lastFailed: data.last_failed ?? null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const sendTest = async () => {
    if (!confirm("Kirim test notification ke seluruh device aktif?")) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("notification-audit", {
        body: { action: "send_test" },
      });
      if (error) throw error;
      if (!data?.ok) {
        toast.error(`Gagal: ${data?.error ?? "unknown"}`);
      } else {
        toast.success(
          `Test push terkirim — ${data.sent}/${data.total} sukses, ${data.failed} gagal`,
        );
      }
      await load();
    } catch (e) {
      toast.error("Gagal mengirim: " + (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const fmt = (s: string | null) => s ? new Date(s).toLocaleString("id-ID") : "—";

  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-primary" />
          Notification Audit
        </CardTitle>
        <div className="flex items-center gap-2">
          {isOwner && stats?.fcmConfigured && (
            <Button
              size="sm"
              onClick={sendTest}
              disabled={sending || loading || stats.total === 0}
              className="bg-gradient-to-r from-red-500 to-yellow-400 text-white"
            >
              <Send className={`h-3.5 w-3.5 mr-1.5 ${sending ? "animate-pulse" : ""}`} />
              {sending ? "Mengirim..." : "Send Test Notification"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!stats ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tile label="Registered Devices" value={stats.total.toString()} />
              <Tile label="Android" icon={<Smartphone className="h-3.5 w-3.5" />} value={stats.android.toString()} />
              <Tile label="iPhone" icon={<Apple className="h-3.5 w-3.5" />} value={stats.ios.toString()} />
              <Tile label="Web" icon={<Globe className="h-3.5 w-3.5" />} value={stats.web.toString()} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tile
                label="Firebase SW"
                value={stats.fbConnected ? "Detected" : "Not detected"}
                tone={stats.fbConnected ? "ok" : "warn"}
              />
              <Tile label="Last Sent" value={fmt(stats.lastSent)} />
              <Tile label="Last Success" value={fmt(stats.lastSuccess)} tone={stats.lastSuccess ? "ok" : undefined} />
              <Tile label="Last Failed" value={fmt(stats.lastFailed)} tone={stats.lastFailed ? "warn" : undefined} />
            </div>
            {!stats.fcmConfigured && (
              <Badge variant="outline" className="text-[10px] text-yellow-500 border-yellow-500/40">
                FCM credentials belum dikonfigurasi — Send Test dinonaktifkan
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Tile = ({ label, value, icon, tone }: { label: string; value: string; icon?: React.ReactNode; tone?: "ok" | "warn" }) => (
  <div className="rounded-xl border border-white/10 bg-muted/30 p-3">
    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">{icon}{label}</div>
    <div className={`font-mono text-sm mt-1 truncate ${tone === "ok" ? "text-green-500" : tone === "warn" ? "text-yellow-500" : ""}`}>
      {value}
    </div>
  </div>
);

export default NotificationAuditPanel;