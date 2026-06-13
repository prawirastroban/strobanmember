import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/lib/appVersion";

interface Release {
  id: string;
  version: string;
  previous_version: string | null;
  released_at: string;
  status: string;
  title: string | null;
  force_update: boolean;
  affected_modules: string[];
}

const DeploymentHistoryPanel = () => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [stats, setStats] = useState({ total: 0, updated: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: rel }, { data: clients }] = await Promise.all([
      supabase.from("app_releases").select("*").order("released_at", { ascending: false }).limit(50),
      supabase.from("app_version_clients").select("current_version"),
    ]);
    setReleases((rel as Release[]) ?? []);
    const list = clients ?? [];
    const updated = list.filter((c: { current_version: string | null }) => c.current_version === APP_VERSION).length;
    setStats({ total: list.length, updated, pending: list.length - updated });
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-primary" /> Deployment History & Feature Adoption
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={() => void load()}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <KPI label="Total Tracked" value={stats.total} />
          <KPI label="Versi Terbaru" value={stats.updated} tone="ok" />
          <KPI label="Belum Update" value={stats.pending} tone="warn" />
        </div>
        <div className="space-y-2">
          {releases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada deployment.</p>
          ) : releases.map(r => (
            <div key={r.id} className="rounded-lg border border-white/10 bg-muted/20 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold">v{r.version}</span>
                <Badge variant={r.status === "published" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge>
                {r.force_update && <Badge variant="destructive" className="text-[10px]">Force</Badge>}
                <span className="text-[11px] text-muted-foreground">
                  {new Date(r.released_at).toLocaleString("id-ID")}
                </span>
              </div>
              {r.title && <div className="text-xs mt-1">{r.title}</div>}
              {r.affected_modules?.length > 0 && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  Modul: {r.affected_modules.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const KPI = ({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) => (
  <div className="rounded-xl border border-white/10 bg-muted/30 p-3 text-center">
    <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    <div className={`text-xl font-bold mt-0.5 ${tone === "ok" ? "text-green-500" : tone === "warn" ? "text-yellow-500" : ""}`}>{value}</div>
  </div>
);

export default DeploymentHistoryPanel;