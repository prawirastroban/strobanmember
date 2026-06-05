import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RotateCcw, Smartphone, Monitor, Apple, Eye, CheckCircle2, XCircle } from "lucide-react";

interface Stats {
  total: { shown: number; accepted: number; dismissed: number };
  byPlatform: Record<"android" | "ios" | "desktop", { shown: number; accepted: number; dismissed: number }>;
}

const emptyStats: Stats = {
  total: { shown: 0, accepted: 0, dismissed: 0 },
  byPlatform: {
    android: { shown: 0, accepted: 0, dismissed: 0 },
    ios: { shown: 0, accepted: 0, dismissed: 0 },
    desktop: { shown: 0, accepted: 0, dismissed: 0 },
  },
};

const PwaSettingsManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    banner_enabled: true,
    banner_title: "Install Sahabat Stroban",
    banner_subtitle: "Akses lebih cepat & notifikasi langsung",
    delay_seconds: 5,
    reprompt_days: 0,
  });
  const [stats, setStats] = useState<Stats>(emptyStats);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: cfg } = await supabase
        .from("pwa_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (cfg) {
        setForm({
          banner_enabled: cfg.banner_enabled,
          banner_title: cfg.banner_title,
          banner_subtitle: cfg.banner_subtitle,
          delay_seconds: cfg.delay_seconds,
          reprompt_days: cfg.reprompt_days,
        });
      }

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await supabase
        .from("pwa_events")
        .select("event, platform")
        .gte("created_at", since)
        .limit(10000);

      const next = JSON.parse(JSON.stringify(emptyStats)) as Stats;
      (events || []).forEach((e: any) => {
        const evt = e.event as keyof Stats["total"];
        const plat = e.platform as keyof Stats["byPlatform"];
        if (next.total[evt] !== undefined) next.total[evt]++;
        if (next.byPlatform[plat] && next.byPlatform[plat][evt] !== undefined) {
          next.byPlatform[plat][evt]++;
        }
      });
      setStats(next);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pwa_settings")
        .update({
          banner_enabled: form.banner_enabled,
          banner_title: form.banner_title.trim() || "Install App",
          banner_subtitle: form.banner_subtitle.trim(),
          delay_seconds: Math.max(0, Math.min(60, Number(form.delay_seconds) || 0)),
          reprompt_days: Math.max(0, Math.min(90, Number(form.reprompt_days) || 0)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (error) throw error;
      toast.success("Pengaturan PWA tersimpan");
    } catch (e: any) {
      toast.error("Gagal menyimpan", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const resetLocal = () => {
    try {
      localStorage.removeItem("pwa_install_banner_dismissed_at");
      localStorage.removeItem("pwa_install_banner_shown"); // legacy key
      toast.success("Status banner di browser ini direset", {
        description: "Refresh halaman utama untuk melihat banner muncul kembali.",
      });
    } catch {
      toast.error("Gagal mengakses localStorage");
    }
  };

  const conv = stats.total.shown > 0 ? ((stats.total.accepted / stats.total.shown) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Banner Install Aplikasi</CardTitle>
          <CardDescription>
            Kelola banner yang muncul otomatis saat pengunjung membuka web di browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat pengaturan…
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm font-medium">Aktifkan banner install</Label>
                  <p className="text-xs text-muted-foreground">
                    Matikan untuk menyembunyikan banner di semua perangkat secara realtime.
                  </p>
                </div>
                <Switch
                  checked={form.banner_enabled}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, banner_enabled: v }))}
                />
              </div>

              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Judul banner</Label>
                  <Input
                    value={form.banner_title}
                    onChange={(e) => setForm((f) => ({ ...f, banner_title: e.target.value }))}
                    maxLength={60}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Subtitle banner</Label>
                  <Textarea
                    rows={2}
                    value={form.banner_subtitle}
                    onChange={(e) => setForm((f) => ({ ...f, banner_subtitle: e.target.value }))}
                    maxLength={140}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Delay tampil (detik)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={form.delay_seconds}
                    onChange={(e) => setForm((f) => ({ ...f, delay_seconds: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Berapa detik setelah halaman terbuka.</p>
                </div>
                <div className="grid gap-1.5">
                  <Label>Re-prompt setelah (hari)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={90}
                    value={form.reprompt_days}
                    onChange={(e) => setForm((f) => ({ ...f, reprompt_days: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    <b>0</b> = tampil sekali sampai install/dismiss. <b>&gt; 0</b> = tampil ulang setelah N hari.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Simpan Pengaturan
                </Button>
                <Button variant="outline" onClick={resetLocal}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset status di browser ini
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistik 30 Hari Terakhir</CardTitle>
          <CardDescription>Performa banner install berdasarkan event yang tercatat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile icon={<Eye className="h-4 w-4" />} label="Tampil" value={stats.total.shown} tone="muted" />
            <StatTile icon={<CheckCircle2 className="h-4 w-4" />} label="Install" value={stats.total.accepted} tone="success" />
            <StatTile icon={<XCircle className="h-4 w-4" />} label="Dismiss" value={stats.total.dismissed} tone="destructive" />
            <StatTile icon={<CheckCircle2 className="h-4 w-4" />} label="Conversion" value={`${conv}%`} tone="primary" />
          </div>

          <Separator />

          <div className="grid gap-3 md:grid-cols-3">
            <PlatformCard icon={<Smartphone className="h-4 w-4" />} name="Android" s={stats.byPlatform.android} />
            <PlatformCard icon={<Apple className="h-4 w-4" />} name="iOS" s={stats.byPlatform.ios} />
            <PlatformCard icon={<Monitor className="h-4 w-4" />} name="Desktop" s={stats.byPlatform.desktop} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StatTile = ({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: number | string; tone: "muted" | "success" | "destructive" | "primary" }) => {
  const toneCls = {
    muted: "text-muted-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    destructive: "text-destructive",
    primary: "text-primary",
  }[tone];
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className={`flex items-center gap-1.5 text-xs ${toneCls}`}>
        {icon} <span className="font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
};

const PlatformCard = ({
  icon, name, s,
}: { icon: React.ReactNode; name: string; s: { shown: number; accepted: number; dismissed: number } }) => {
  const conv = s.shown > 0 ? ((s.accepted / s.shown) * 100).toFixed(1) : "0.0";
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-semibold">{icon} {name}</div>
      <div className="grid grid-cols-3 gap-1 text-xs">
        <div><div className="text-muted-foreground">Tampil</div><div className="font-semibold">{s.shown}</div></div>
        <div><div className="text-muted-foreground">Install</div><div className="font-semibold text-emerald-600 dark:text-emerald-400">{s.accepted}</div></div>
        <div><div className="text-muted-foreground">Dismiss</div><div className="font-semibold text-destructive">{s.dismissed}</div></div>
      </div>
      <div className="text-xs text-muted-foreground">Conversion: <b className="text-primary">{conv}%</b></div>
    </div>
  );
};

export default PwaSettingsManager;