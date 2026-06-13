import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, RefreshCw, LogOut, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { APP_VERSION, compareVersion } from "@/lib/appVersion";
import { useAppVersion } from "@/hooks/useAppVersion";

interface ClientRow {
  user_id: string;
  current_version: string | null;
  last_seen_at: string;
  browser: string | null;
  os: string | null;
  update_status: string;
  profile?: { full_name?: string | null; email?: string | null } | null;
}

const sendCmd = async (action: string, target: string = "*") => {
  const ch = supabase.channel("client_commands");
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); });
  });
  await ch.send({ type: "broadcast", event: "cmd", payload: { action, target } });
  await supabase.removeChannel(ch);
};

const UserSessionsPanel = () => {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyOutdated, setOnlyOutdated] = useState(false);
  const { latest } = useAppVersion();
  const liveVersion = latest || APP_VERSION;

  const load = async () => {
    setLoading(true);
    const { data: versions } = await supabase
      .from("app_version_clients")
      .select("user_id, current_version, last_seen_at, browser, os, update_status")
      .order("last_seen_at", { ascending: false })
      .limit(100);
    const ids = (versions ?? []).map(v => v.user_id);
    let profilesById: Record<string, { full_name: string | null; email: string | null }> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      profilesById = Object.fromEntries((profs ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]));
    }
    const mapped: ClientRow[] = (versions ?? []).map(v => ({
      ...v,
      profile: profilesById[v.user_id] ?? null,
    }));
    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const broadcast = async (action: string, target: string = "*") => {
    await sendCmd(action, target);
    toast.success(`Perintah "${action}" terkirim`);
  };

  const isOnline = (last: string) => Date.now() - new Date(last).getTime() < 5 * 60_000;

  const isOutdated = (v: string | null) => !!v && compareVersion(v, liveVersion) < 0;
  const visibleRows = onlyOutdated ? rows.filter(r => isOutdated(r.current_version)) : rows;
  const outdatedCount = rows.filter(r => isOutdated(r.current_version)).length;

  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" /> User Sessions
        </CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={onlyOutdated ? "default" : "outline"}
            onClick={() => setOnlyOutdated(v => !v)}
            title="Filter user yang belum update"
          >
            Tertinggal ({outdatedCount})
          </Button>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={() => broadcast("refresh")}>
            <Download className="h-4 w-4 mr-1" /> Refresh Semua
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Memuat...</p>
        ) : visibleRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Belum ada data sesi.</p>
        ) : visibleRows.map(r => (
          <div key={r.user_id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-muted/20 p-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`h-2 w-2 rounded-full ${isOnline(r.last_seen_at) ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="text-sm font-medium truncate">
                  {r.profile?.full_name || r.profile?.email || r.user_id.slice(0, 8)}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">v{r.current_version || "?"}</Badge>
                {isOutdated(r.current_version) ? (
                  <Badge variant="destructive" className="text-[10px]">Tertinggal</Badge>
                ) : (
                  <Badge className="text-[10px] bg-green-500/15 text-green-600 hover:bg-green-500/15">Up-to-date</Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {r.browser} · {r.os} · {new Date(r.last_seen_at).toLocaleString("id-ID")}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" title="Force Refresh" onClick={() => broadcast("refresh", r.user_id)}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" title="Clear Cache" onClick={() => broadcast("clear_cache", r.user_id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" title="Force Logout" onClick={() => broadcast("logout", r.user_id)}>
                <LogOut className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default UserSessionsPanel;