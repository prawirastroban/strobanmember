import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION, APP_BUILD_NUMBER } from "@/lib/appVersion";
import { toast } from "sonner";
import { ShieldAlert, Zap, RefreshCw } from "lucide-react";

interface ForceLog {
  version: string;
  triggered_by: string | null;
  triggered_by_name?: string | null;
  triggered_at: string;
}

const ForceRefreshCenter = () => {
  const [latest, setLatest] = useState<string>("-");
  const [log, setLog] = useState<ForceLog | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("app_settings")
      .select("key,value")
      .in("key", ["app_version", "force_refresh_log"]);
    if (data) {
      for (const row of data) {
        const v = row.value as Record<string, unknown> | null;
        if (!v) continue;
        if (row.key === "app_version" && typeof v.version === "string") {
          setLatest(v.version);
        }
        if (row.key === "force_refresh_log") {
          setLog({
            version: String(v.version ?? ""),
            triggered_by: (v.triggered_by as string) ?? null,
            triggered_by_name: (v.triggered_by_name as string) ?? null,
            triggered_at: String(v.triggered_at ?? ""),
          });
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const trigger = async () => {
    setBusy(true);
    try {
      const { data: me } = await supabase.auth.getUser();
      const uid = me.user?.id ?? null;
      const email = me.user?.email ?? null;
      const now = new Date().toISOString();
      const targetVersion = latest && latest !== "-" ? latest : APP_VERSION;

      // 1) Bump min_version + flip force_refresh ON via existing app_settings keys
      const { data: cur } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "app_version")
        .maybeSingle();
      const curVal = (cur?.value as Record<string, unknown> | null) ?? {};
      const updatedVersion: Record<string, unknown> = {
        ...curVal,
        version: targetVersion,
        force_refresh: true,
        released_at:
          typeof curVal.released_at === "string" ? curVal.released_at : now,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settings = supabase.from("app_settings") as any;
      await settings.upsert(
        [{ key: "app_version", value: updatedVersion, updated_at: now }],
        { onConflict: "key" },
      );
      await settings.upsert(
        [{ key: "app_min_version", value: { version: targetVersion }, updated_at: now }],
        { onConflict: "key" },
      );
      await settings.upsert(
        [{
          key: "force_refresh_log",
          value: {
            version: targetVersion,
            triggered_by: uid,
            triggered_by_name: email,
            triggered_at: now,
          },
          updated_at: now,
        }],
        { onConflict: "key" },
      );

      // 2) Broadcast refresh command to all connected clients (reuse existing channel)
      try {
        const ch = supabase.channel("client_commands");
        await new Promise<void>((resolve) => {
          ch.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); });
        });
        await ch.send({
          type: "broadcast",
          event: "cmd",
          payload: { action: "refresh", target: "*", except: uid },
        });
        await supabase.removeChannel(ch);
      } catch {
        /* ignore broadcast errors */
      }

      toast.success("Force refresh dikirim ke semua client");
      await load();
    } catch (err) {
      toast.error("Gagal: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          Force Refresh Center
          <Badge variant="destructive" className="ml-2 text-[10px]">Owner Only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Versi Target</div>
            <div className="font-mono text-sm mt-1">{latest}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Build #{APP_BUILD_NUMBER}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Last Force Refresh</div>
            <div className="font-mono text-sm mt-1">
              {log?.triggered_at ? new Date(log.triggered_at).toLocaleString("id-ID") : "—"}
            </div>
            {log?.version && (
              <div className="text-[10px] text-muted-foreground mt-1">Target: v{log.version}</div>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Triggered By</div>
            <div className="font-mono text-xs mt-1 truncate">
              {log?.triggered_by_name || log?.triggered_by || "—"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-sm">Paksa Semua User Update</div>
              <p className="text-xs text-muted-foreground mt-1">
                Semua client akan menerima modal blocking, cache lama dibersihkan,
                dan service worker `/sw.js` di-unregister. Aman dari refresh-loop —
                cache Firebase Messaging tetap utuh.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={busy || loading}
                    className="mt-3 bg-gradient-to-r from-red-500 to-yellow-400 text-white"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Paksa Semua User Update
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Force Refresh</AlertDialogTitle>
                    <AlertDialogDescription>
                      Semua pengguna aktif akan dipaksa reload ke versi <b>{latest}</b>.
                      Tindakan ini tidak dapat dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={trigger}>Ya, Paksa Update</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="sm" onClick={load} className="mt-3 ml-2" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                Muat ulang
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForceRefreshCenter;