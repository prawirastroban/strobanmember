import { useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { APP_VERSION, APP_BUILD_NUMBER, compareVersion } from "@/lib/appVersion";
import { RefreshCw, Rocket, Save, Files, Package, Radio, CalendarDays, UserCircle2, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import { detectEnvironment, environmentBadgeClass, environmentLabel } from "@/lib/environment";
import { useVersionRegistry, formatReleaseDate, type ReleaseChannel, type DeploymentType } from "@/services/versionRegistry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function bump(version: string, kind: "patch" | "minor" | "major"): string {
  const parts = version.split(".").map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  if (kind === "major") {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (kind === "minor") {
    parts[1] += 1;
    parts[2] = 0;
  } else {
    parts[2] += 1;
  }
  return parts.slice(0, 3).join(".");
}

const AppVersionManager = () => {
  const [latest, setLatest] = useState("1.0.0");
  const [minVersion, setMinVersion] = useState("1.0.0");
  const [notes, setNotes] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [releasedAt, setReleasedAt] = useState<string | null>(null);
  const [previousVersion, setPreviousVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buildNumber, setBuildNumber] = useState<string>(String(APP_BUILD_NUMBER));
  const [releaseChannel, setReleaseChannel] = useState<ReleaseChannel>("production");
  const [deploymentType, setDeploymentType] = useState<DeploymentType>("optional");
  const env = detectEnvironment();
  const { info: registry, loading: registryLoading, refresh: refreshRegistry } = useVersionRegistry();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("app_settings")
      .select("key, value, updated_at")
      .in("key", ["app_version", "app_min_version"]);
    if (data) {
      for (const row of data) {
        const v = row.value as Record<string, unknown> | null;
        if (!v) continue;
        if (row.key === "app_version") {
          if (typeof v.version === "string") setLatest(v.version);
          if (typeof v.release_notes === "string") setNotes(v.release_notes);
          setForceRefresh(Boolean(v.force_refresh));
          setReleasedAt(
            (v.released_at as string) || (row.updated_at as string) || null,
          );
        } else if (row.key === "app_min_version") {
          if (typeof v.version === "string") setMinVersion(v.version);
        }
      }
    }
    setLoading(false);
    // Previous version from app_releases history
    try {
      const { data: hist } = await supabase
        .from("app_releases")
        .select("version, released_at, status, deployment_type, force_update")
        .eq("status", "published")
        .order("released_at", { ascending: false })
        .limit(2);
      if (hist && hist.length >= 2) setPreviousVersion(hist[1].version);
      else setPreviousVersion(null);
      if (hist && hist[0]) {
        const top = hist[0] as unknown as {
          deployment_type?: DeploymentType | null;
          force_update?: boolean | null;
        };
        if (top.deployment_type) {
          setDeploymentType(top.deployment_type);
        } else if (top.force_update) {
          setDeploymentType("force");
        }
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (publish: boolean) => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const isForce = deploymentType === "force";
      const effectiveForceRefresh = forceRefresh || isForce;
      const versionPayload = {
        version: latest,
        release_notes: notes,
        force_refresh: effectiveForceRefresh,
        released_at: publish ? now : releasedAt,
        deployment_type: deploymentType,
      };
      const { error: e1 } = await supabase
        .from("app_settings")
        .upsert(
          { key: "app_version", value: versionPayload, updated_at: now },
          { onConflict: "key" },
        );
      const { error: e2 } = await supabase
        .from("app_settings")
        .upsert(
          {
            key: "app_min_version",
            value: { version: minVersion },
            updated_at: now,
          },
          { onConflict: "key" },
        );
      if (e1 || e2) throw e1 || e2;
      // Auto-create release row when publishing
      if (publish) {
        const { data: existing } = await supabase
          .from("app_releases")
          .select("id")
          .eq("version", latest)
          .maybeSingle();
        const buildNumberInt = parseInt(buildNumber, 10);
        const buildNumberValue = Number.isFinite(buildNumberInt) && buildNumberInt > 0 ? buildNumberInt : null;
        if (!existing) {
          const { data: userData } = await supabase.auth.getUser();
          await supabase.from("app_releases").insert({
            version: latest,
            released_by: userData.user?.id ?? null,
            status: "published",
            summary: notes || null,
            force_update: effectiveForceRefresh,
            priority: isForce ? "high" : deploymentType === "recommended" ? "normal" : "low",
            build_number: buildNumberValue,
            release_channel: releaseChannel,
            deployment_type: deploymentType,
          });
        } else {
          await supabase
            .from("app_releases")
            .update({
              summary: notes || null,
              force_update: effectiveForceRefresh,
              status: "published",
              build_number: buildNumberValue,
              release_channel: releaseChannel,
              deployment_type: deploymentType,
            })
            .eq("id", existing.id);
        }
      }
      toast.success(publish ? "Versi dipublikasikan" : "Tersimpan");
      if (publish) setReleasedAt(now);
      void refreshRegistry();
      if (publish) {
        // Broadcast refresh to all connected clients so they hard-reload to the new version.
        try {
          const { data: me } = await supabase.auth.getUser();
          const selfId = me.user?.id ?? null;
          const ch = supabase.channel("client_commands");
          await new Promise<void>((resolve) => {
            ch.subscribe((status) => {
              if (status === "SUBSCRIBED") resolve();
            });
          });
          await ch.send({
            type: "broadcast",
            event: "cmd",
            payload: { action: "refresh", target: "*", except: selfId },
          });
          await supabase.removeChannel(ch);
          toast.success("Semua pengguna akan diperbarui otomatis");
        } catch {
          /* ignore broadcast errors */
        }
      }
    } catch (err) {
      toast.error("Gagal menyimpan: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const yourBuildCmp = compareVersion(APP_VERSION, latest);

  return (
    <div className="space-y-4 w-full">
      <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Package className="h-5 w-5 text-primary" />
            Version Registry
            <Badge variant="outline" className="ml-auto text-[10px]">Phase 1</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Pusat informasi versi aplikasi. Data ini menjadi sumber tunggal untuk fitur Update Manager selanjutnya.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <RegistryTile
              icon={<GitBranch className="h-4 w-4" />}
              label="Current Version"
              value={registry ? `v${registry.currentVersion}` : "—"}
              loading={registryLoading}
              mono
            />
            <RegistryTile
              icon={<Package className="h-4 w-4" />}
              label="Build Number"
              value={registry ? `#${registry.buildNumber}` : "—"}
              loading={registryLoading}
              mono
            />
            <RegistryTile
              icon={<CalendarDays className="h-4 w-4" />}
              label="Release Date"
              value={formatReleaseDate(registry?.releaseDate ?? null)}
              loading={registryLoading}
            />
            <RegistryTile
              icon={<Rocket className="h-4 w-4" />}
              label="Deployment Status"
              value={
                registry ? (
                  <Badge
                    variant="outline"
                    className={
                      registry.deploymentStatus === "published"
                        ? "border-emerald-500/40 text-emerald-400"
                        : registry.deploymentStatus === "archived"
                          ? "border-zinc-500/40 text-zinc-400"
                          : "border-amber-500/40 text-amber-400"
                    }
                  >
                    {registry.deploymentStatus.charAt(0).toUpperCase() + registry.deploymentStatus.slice(1)}
                  </Badge>
                ) : (
                  "—"
                )
              }
              loading={registryLoading}
            />
            <RegistryTile
              icon={<Radio className="h-4 w-4" />}
              label="Release Channel"
              value={
                registry ? (
                  <Badge
                    variant="outline"
                    className={
                      registry.releaseChannel === "beta"
                        ? "border-violet-500/40 text-violet-400"
                        : "border-sky-500/40 text-sky-400"
                    }
                  >
                    {registry.releaseChannel === "beta" ? "Beta" : "Production"}
                  </Badge>
                ) : (
                  "—"
                )
              }
              loading={registryLoading}
            />
            <RegistryTile
              icon={<UserCircle2 className="h-4 w-4" />}
              label="Release By"
              value={
                registry?.releaseBy
                  ? registry.releaseBy.name || registry.releaseBy.phone || registry.releaseBy.id.slice(0, 8)
                  : "—"
              }
              hint={registry?.releaseBy?.phone ?? undefined}
              loading={registryLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Rocket className="h-5 w-5 text-primary" />
            Kontrol Versi Aplikasi
            <Badge variant="outline" className={`ml-auto ${environmentBadgeClass(env)}`}>
              {environmentLabel(env)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/10 bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Build Anda</div>
              <div className="font-mono text-sm mt-1">{APP_VERSION}</div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1">
                Build #{APP_BUILD_NUMBER} · Play Store versionCode
              </div>
              <Badge
                variant={yourBuildCmp >= 0 ? "default" : "destructive"}
                className="mt-2"
              >
                {yourBuildCmp >= 0 ? "Up-to-date" : "Tertinggal"}
              </Badge>
            </div>
            <div className="rounded-xl border border-white/10 bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Versi Live</div>
              <div className="font-mono text-sm mt-1">{latest}</div>
              {releasedAt && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(releasedAt).toLocaleString("id-ID")}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Versi Sebelumnya</div>
              <div className="font-mono text-sm mt-1">{previousVersion ?? "—"}</div>
              <div className="text-[10px] text-muted-foreground mt-1">Dari riwayat rilis</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Minimum Didukung</div>
              <div className="font-mono text-sm mt-1">{minVersion}</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Lebih lama = wajib refresh
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Versi Terbaru</Label>
            <div className="flex gap-2">
              <Input
                value={latest}
                onChange={(e) => setLatest(e.target.value)}
                placeholder="1.0.0"
                className="font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLatest(bump(latest, "patch"))}
              >
                Patch
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLatest(bump(latest, "minor"))}
              >
                Minor
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLatest(bump(latest, "major"))}
              >
                Major
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Build Number</Label>
              <Input
                value={buildNumber}
                onChange={(e) => setBuildNumber(e.target.value.replace(/\D/g, ""))}
                placeholder={String(APP_BUILD_NUMBER)}
                inputMode="numeric"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Angka terpisah dari versi (Play Store versionCode). Contoh: v2.7.3 → 273.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Release Channel</Label>
              <Select
                value={releaseChannel}
                onValueChange={(v) => setReleaseChannel(v as ReleaseChannel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Beta hanya untuk uji internal; Production untuk seluruh pengguna.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Versi Minimum Didukung</Label>
            <Input
              value={minVersion}
              onChange={(e) => setMinVersion(e.target.value)}
              placeholder="1.0.0"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Client dengan build lebih lama dari ini akan dipaksa refresh.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Catatan Rilis</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Apa yang baru di versi ini..."
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-muted/30 p-3 space-y-3">
            <div>
              <div className="font-medium text-sm">Deployment Type</div>
              <div className="text-xs text-muted-foreground">
                Menentukan bagaimana update disampaikan ke seluruh pengguna.
              </div>
            </div>
            <RadioGroup
              value={deploymentType}
              onValueChange={(v) => setDeploymentType(v as DeploymentType)}
              className="grid gap-2"
            >
              {[
                {
                  value: "optional" as const,
                  title: "Optional",
                  desc: "Snackbar informatif. User tetap dapat menggunakan aplikasi.",
                },
                {
                  value: "recommended" as const,
                  title: "Recommended",
                  desc: "Dialog update dengan opsi Update Sekarang / Nanti (snooze 30 menit).",
                },
                {
                  value: "force" as const,
                  title: "Force",
                  desc: "Full-screen blocking + countdown 10 detik + auto-update.",
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`dt-${opt.value}`}
                  className={`flex items-start gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2 cursor-pointer hover:bg-muted/40 ${
                    deploymentType === opt.value ? "ring-1 ring-primary/60" : ""
                  }`}
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`dt-${opt.value}`}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {opt.title}
                      {opt.value === "force" && (
                        <Badge variant="destructive" className="text-[10px]">
                          Blocking
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={() => save(true)}
              disabled={saving || loading}
              className="bg-gradient-to-r from-red-500 to-yellow-400 text-white hover:opacity-90"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Publish Versi
            </Button>
            <Button
              onClick={() => save(false)}
              disabled={saving || loading}
              variant="outline"
            >
              <Save className="h-4 w-4 mr-2" />
              Simpan Draft
            </Button>
            <Button onClick={load} variant="ghost" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Muat Ulang
            </Button>
            <Button asChild variant="ghost" className="ml-auto">
              <Link to="/dashboard/page-audit">
                <Files className="h-4 w-4 mr-2" />
                Buka Audit Halaman
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppVersionManager;

function RegistryTile({
  icon,
  label,
  value,
  hint,
  loading,
  mono,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  loading?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>
        {loading ? <span className="text-muted-foreground">…</span> : value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</div>}
    </div>
  );
}