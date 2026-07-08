import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  RefreshCw, Rocket, History, Users, Database,
  ShieldCheck, Wifi, Bell, KeyRound, Link2, Globe, Activity, AlertTriangle,
} from "lucide-react";
import { useSystemCenter } from "@/hooks/useSystemCenter";
import { detectEnvironment, environmentBadgeClass, environmentLabel } from "@/lib/environment";
import { APP_BUILD_NUMBER, APP_VERSION, MIN_SUPPORTED_VERSION } from "@/config/version";
import { formatReleaseDate } from "@/services/versionRegistry";
import type { ServiceState, SummaryRange } from "@/services/systemCenter";

// ── Helpers ─────────────────────────────────────────────────────────────────
const stateDot = (s: ServiceState) => {
  if (s === "healthy") return "bg-green-500";
  if (s === "warning") return "bg-amber-500";
  return "bg-red-500";
};
const stateLabel = (s: ServiceState) =>
  s === "healthy" ? "Healthy" : s === "warning" ? "Warning" : "Offline";

const deployBadgeClass = (t: string | undefined) => {
  if (t === "force") return "bg-red-500/15 text-red-500 border-red-500/30";
  if (t === "recommended") return "bg-amber-500/15 text-amber-500 border-amber-500/30";
  return "bg-blue-500/15 text-blue-500 border-blue-500/30";
};

const statusBadgeClass = (s: string | undefined) => {
  if (s === "published") return "bg-green-500/15 text-green-500 border-green-500/30";
  if (s === "archived") return "bg-muted text-muted-foreground border-white/10";
  return "bg-amber-500/15 text-amber-500 border-amber-500/30";
};

const clockHM = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
};

// ── Sub cards ───────────────────────────────────────────────────────────────

const CardShell = ({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
  <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-semibold flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm space-y-2">{children}</CardContent>
  </Card>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-right truncate">{value}</span>
  </div>
);

// ── Main ────────────────────────────────────────────────────────────────────

const SystemManagementCenter = () => {
  const env = detectEnvironment();
  const s = useSystemCenter();

  const app = s.app;
  const clients = s.clients;
  const server = s.server;

  const updated = s.lastUpdated
    ? s.lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={environmentBadgeClass(env)}>
            ENV: {environmentLabel(env)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Pusat kontrol lifecycle aplikasi — versi, deployment, audit, & health monitoring
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <RefreshCw className={`h-3 w-3 ${s.loading ? "animate-spin" : ""}`} />
            Live · {updated}
          </span>
          <Button size="sm" variant="outline" onClick={() => void s.refresh()} disabled={s.loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {s.error && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="p-3 text-xs text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {s.error}
            <Button size="sm" variant="ghost" onClick={() => void s.refresh()} className="ml-auto h-7">
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Row 1: Application, Client, Server */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Application status */}
        <CardShell title="Application Status" icon={Rocket}>
          {!app ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <>
              <Row label="Current Version" value={<span className="font-bold text-primary">v{app.currentVersion}</span>} />
              <Row label="Previous Version" value={app.previousVersion ? `v${app.previousVersion}` : "—"} />
              <Row label="Release Date" value={formatReleaseDate(app.releaseDate)} />
              <Row label="Deployment Type" value={
                <Badge variant="outline" className={deployBadgeClass(app.deploymentType)}>
                  {app.deploymentType}
                </Badge>
              } />
              <Row label="Deployment Status" value={
                <Badge variant="outline" className={statusBadgeClass(app.deploymentStatus)}>
                  {app.deploymentStatus}
                </Badge>
              } />
              <Row label="Min Supported" value={app.minSupportedVersion ? `v${app.minSupportedVersion}` : `v${MIN_SUPPORTED_VERSION}`} />
            </>
          )}
        </CardShell>

        {/* Client status */}
        <CardShell title="Client Status" icon={Users}>
          {!clients ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <>
              <Row label="Total Active Users" value={clients.totalUsers} />
              <Row label="Online Users" value={<span className="text-green-500 font-semibold">{clients.onlineUsers}</span>} />
              <Row label="Users Updated" value={clients.usersUpdated} />
              <Row label="Pending Update" value={clients.usersPending} />
              <Row label="Failed Update" value={<span className={clients.usersFailed > 0 ? "text-red-500" : ""}>{clients.usersFailed}</span>} />
              <div className="pt-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Adoption</span>
                  <span className="font-semibold text-foreground">{clients.adoptionPct}%</span>
                </div>
                <Progress value={clients.adoptionPct} className="h-2" />
              </div>
            </>
          )}
        </CardShell>

        {/* Server status */}
        <CardShell title="Server Status" icon={Activity}>
          {!server ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : (
            <>
              {([
                ["API", server.api, Globe],
                ["Database", server.database, Database],
                ["Storage", server.storage, Database],
                ["Realtime", server.realtime, Wifi],
                ["Notification", server.notification, Bell],
              ] as [string, ServiceState, React.ComponentType<{ className?: string }>][]).map(([name, state, Icon]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" /> {name}
                  </span>
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <span className={`h-2 w-2 rounded-full ${stateDot(state)}`} />
                    {stateLabel(state)}
                  </span>
                </div>
              ))}
            </>
          )}
        </CardShell>
      </div>

      {/* Row 2: Deployment Summary + Version Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Deployment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={s.summaryRange} onValueChange={(v) => s.setSummaryRange(v as SummaryRange)}>
              <TabsList className="bg-muted/40">
                <TabsTrigger value="today">Hari Ini</TabsTrigger>
                <TabsTrigger value="week">Minggu Ini</TabsTrigger>
                <TabsTrigger value="month">Bulan Ini</TabsTrigger>
              </TabsList>
              <TabsContent value={s.summaryRange} className="mt-3">
                {!s.summary ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-white/10 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase">Total Deployment</p>
                      <p className="text-xl font-bold">{s.summary.totalDeployments}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase">Total Release</p>
                      <p className="text-xl font-bold">{s.summary.totalReleases}</p>
                    </div>
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                      <p className="text-[11px] text-green-500 uppercase">Successful</p>
                      <p className="text-xl font-bold text-green-500">{s.summary.successful}</p>
                    </div>
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                      <p className="text-[11px] text-red-500 uppercase">Failed</p>
                      <p className="text-xl font-bold text-red-500">{s.summary.failed}</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <CardShell title="Version Distribution" icon={Users}>
          {s.distribution.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Belum ada data client versi.</p>
          ) : (
            <div className="space-y-3">
              {s.distribution.map((d) => (
                <div key={d.version}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{d.version === "Older" ? "Older" : `v${d.version}`}</span>
                    <span className="text-muted-foreground">{d.pct}% · {d.users} user</span>
                  </div>
                  <Progress value={d.pct} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </CardShell>
      </div>

      {/* Row 3: Recent Activity */}
      <CardShell title="Recent Activity" icon={Activity}>
        {s.activity.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Belum ada aktivitas sistem tercatat.</p>
        ) : (
          <ul className="space-y-2">
            {s.activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 border-b border-white/5 last:border-0 pb-2 last:pb-0">
                <span className="text-xs text-muted-foreground w-12 shrink-0 font-mono">{clockHM(a.at)}</span>
                <span className="text-sm flex-1">{a.label}</span>
                {a.actor && (
                  <Badge variant="outline" className="text-[10px] border-white/10">{a.actor}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardShell>

      {/* Row 4: System Info + Security Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <CardShell title="System Information" icon={ShieldCheck}>
          <Row label="Application Name" value="Stroban Service" />
          <Row label="Current Version" value={`v${app?.currentVersion ?? APP_VERSION}`} />
          <Row label="Current Build" value={String(app?.buildNumber ?? APP_BUILD_NUMBER)} />
          <Row label="Capacitor Version" value="8.x" />
          <Row label="PWA Version" value={`v${APP_VERSION}`} />
          <Row label="Environment" value={
            <Badge variant="outline" className={environmentBadgeClass(env)}>{environmentLabel(env)}</Badge>
          } />
          <Row label="Last Deployment" value={formatReleaseDate(app?.releaseDate ?? null)} />
          <Row label="Developer" value={app?.releaseBy?.name || "—"} />
        </CardShell>

        <CardShell title="Security Information" icon={KeyRound}>
          <SecurityRow icon={Globe} label="HTTPS" value={typeof window !== "undefined" && window.location.protocol === "https:"} />
          <SecurityRow icon={KeyRound} label="Authentication" value={server?.database === "healthy"} healthyText="Healthy" />
          <SecurityRow icon={Wifi} label="Realtime" value={server?.realtime === "healthy"} healthyText="Connected" />
          <SecurityRow icon={ShieldCheck} label="Session" value={true} healthyText="Valid" />
          <SecurityRow icon={Link2} label="App Links" value={env === "production"} healthyText="Verified" fallbackText="Pending" />
          <SecurityRow icon={Bell} label="Push Notification" value={server?.notification === "healthy"} healthyText="Ready" />
        </CardShell>
      </div>
    </div>
  );
};

const SecurityRow = ({
  icon: Icon, label, value, healthyText = "Enabled", fallbackText = "Warning",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: boolean;
  healthyText?: string;
  fallbackText?: string;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground flex items-center gap-2">
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
    <span className="flex items-center gap-2 text-xs font-medium">
      <span className={`h-2 w-2 rounded-full ${value ? "bg-green-500" : "bg-amber-500"}`} />
      {value ? healthyText : fallbackText}
    </span>
  </div>
);

export default SystemManagementCenter;