import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Smartphone, Apple, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Stats {
  total: number;
  android: number;
  ios: number;
  web: number;
  fbConnected: boolean;
  lastSent: string | null;
  lastSuccess: string | null;
  lastFailed: string | null;
}

const NotificationAuditPanel = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokensQ: any = supabase.from("push_tokens").select("platform");
      const { data: tokens } = await tokensQ;
      const arr: Array<{ platform?: string | null }> = Array.isArray(tokens) ? tokens : [];
      const total = arr.length;
      const android = arr.filter(t => (t.platform || "").toLowerCase().includes("android")).length;
      const ios = arr.filter(t => /ios|iphone|ipad/i.test(t.platform || "")).length;
      const web = arr.filter(t => /web|browser/i.test(t.platform || "")).length;

      let lastSent: string | null = null, lastSuccess: string | null = null, lastFailed: string | null = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logsQ: any = supabase.from("push_delivery_logs")
          .select("created_at,status")
          .order("created_at", { ascending: false })
          .limit(200);
        const { data: logs } = await logsQ;
        const logArr: Array<{ created_at: string; status: string }> = Array.isArray(logs) ? logs : [];
        if (logArr.length) lastSent = logArr[0].created_at;
        lastSuccess = logArr.find(l => /sent|success|ok/i.test(l.status))?.created_at ?? null;
        lastFailed = logArr.find(l => /fail|error/i.test(l.status))?.created_at ?? null;
      } catch { /* ignore */ }

      let fbConnected = false;
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          fbConnected = regs.some(r =>
            (r.active?.scriptURL || "").includes("firebase-messaging-sw"));
        }
      } catch { /* ignore */ }

      setStats({ total, android, ios, web, fbConnected, lastSent, lastSuccess, lastFailed });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const fmt = (s: string | null) => s ? new Date(s).toLocaleString("id-ID") : "—";

  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-primary" />
          Notification Audit
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {!stats ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile label="Registered Devices" value={stats.total.toString()} />
            <Tile label="Android" icon={<Smartphone className="h-4 w-4" />} value={stats.android.toString()} />
            <Tile label="iPhone" icon={<Apple className="h-4 w-4" />} value={stats.ios.toString()} />
            <Tile label="Web" value={stats.web.toString()} />
            <Tile label="Firebase SW" value={stats.fbConnected ? "Connected" : "Not detected"}
              tone={stats.fbConnected ? "ok" : "warn"} />
            <Tile label="Last Sent" value={fmt(stats.lastSent)} />
            <Tile label="Last Success" value={fmt(stats.lastSuccess)} tone="ok" />
            <Tile label="Last Failed" value={fmt(stats.lastFailed)} tone={stats.lastFailed ? "warn" : undefined} />
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