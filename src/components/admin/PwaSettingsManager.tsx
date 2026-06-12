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
import { Loader2, RotateCcw, Smartphone, Monitor, Apple, Eye, CheckCircle2, XCircle, Bell, BellOff, Send, CheckCheck, AlertTriangle, BadgeCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWebPush, registerWebPushNow } from "@/hooks/useWebPush";

interface Stats {
  total: { shown: number; accepted: number; dismissed: number };
  byPlatform: Record<"android" | "ios" | "desktop", { shown: number; accepted: number; dismissed: number }>;
}

interface PushAudit {
  active_tokens: number;
  invalid_tokens: number;
  last_push_sent: string | null;
  last_push_success: string | null;
  last_push_failed: string | null;
  last_notification_trigger: string | null;
  last_device_sync: string | null;
  by_platform: Record<string, number>;
  scope: "global" | "self";
}

function formatAuditTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
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
  const { user } = useAuth();
  useWebPush();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    banner_enabled: true,
    banner_title: "Install Sahabat Stroban",
    banner_subtitle: "Akses lebih cepat & notifikasi langsung",
    delay_seconds: 5,
    reprompt_days: 0,
    notification_enabled: true,
    notification_icon_url: "",
    notification_sound_url: "",
    default_ringtone: "default",
    default_vibrate: true,
  });
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [isInstalled, setIsInstalled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [pushAudit, setPushAudit] = useState<PushAudit | null>(null);
  const [registering, setRegistering] = useState(false);
  const badgingSupported = typeof navigator !== "undefined" && "setAppBadge" in navigator;

  useEffect(() => {
    try {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        // @ts-ignore iOS
        window.navigator.standalone === true;
      setIsInstalled(standalone);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Global token stats via SECURITY DEFINER RPC (admin/staff see all devices,
      // regular users see only their own).
      const [{ data, error }, { data: audit }] = await Promise.all([
        supabase.rpc("get_push_token_stats"),
        supabase.rpc("get_pwa_push_audit"),
      ]);
      if (error) {
        console.warn("[PwaSettings] get_push_token_stats failed", error);
        setTokenCount(Number((((audit as unknown) as PushAudit) ?? null)?.active_tokens) || 0);
      } else {
        const total = (((audit as unknown) as PushAudit) ?? null)?.active_tokens ?? (data as any)?.total ?? 0;
        setTokenCount(Number(total) || 0);
      }
      setPushAudit(((audit as unknown) as PushAudit) ?? null);
    })();

    const onStatus = (e: any) => {
      const status = e?.detail?.status;
      if (status === "success") {
        // Refresh count when a new token just registered
        Promise.all([supabase.rpc("get_push_token_stats"), supabase.rpc("get_pwa_push_audit")]).then(([statsRes, auditRes]) => {
          const nextAudit = ((auditRes.data as unknown) as PushAudit) ?? null;
          setTokenCount(Number(nextAudit?.active_tokens ?? (statsRes.data as any)?.total) || 0);
          setPushAudit(nextAudit);
        });
      }
    };
    window.addEventListener("webpush-status", onStatus);
    return () => window.removeEventListener("webpush-status", onStatus);
  }, [user, permission]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: cfg } = await supabase
        .from("pwa_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (cfg) {
        setForm((prev) => ({
          ...prev,
          banner_enabled: cfg.banner_enabled,
          banner_title: cfg.banner_title,
          banner_subtitle: cfg.banner_subtitle,
          delay_seconds: cfg.delay_seconds,
          reprompt_days: cfg.reprompt_days,
          notification_enabled: (cfg as any).notification_enabled ?? true,
          notification_icon_url: (cfg as any).notification_icon_url ?? "",
          notification_sound_url: (cfg as any).notification_sound_url ?? "",
          default_ringtone: (cfg as any).default_ringtone ?? "default",
          default_vibrate: (cfg as any).default_vibrate ?? true,
        }));
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
          notification_enabled: form.notification_enabled,
          notification_icon_url: form.notification_icon_url.trim() || null,
          notification_sound_url: form.notification_sound_url.trim() || null,
          default_ringtone: form.default_ringtone,
          default_vibrate: form.default_vibrate,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", 1);
      if (error) throw error;
      toast.success("Pengaturan PWA tersimpan");
    } catch (e: any) {
      toast.error("Gagal menyimpan", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const requestPerm = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Browser tidak mendukung notifikasi");
      return;
    }
    setRegistering(true);
    try {
      // Single user gesture: request permission + Firebase init + getToken + upsert
      const result = await registerWebPushNow();
      setPermission(typeof Notification !== "undefined" ? Notification.permission : "default");
      window.dispatchEvent(new Event("notif-permission-granted"));
      if (result.ok) {
        toast.success("Perangkat terdaftar", {
          description: "Token push tersimpan. Anda akan menerima notifikasi.",
        });
        // refresh audit
        const [{ data: audit }] = await Promise.all([supabase.rpc("get_pwa_push_audit")]);
        const a = ((audit as unknown) as PushAudit) ?? null;
        setPushAudit(a);
        setTokenCount(Number(a?.active_tokens ?? 0) || 0);
      } else if (result.status === "denied") {
        toast.error("Izin notifikasi ditolak", {
          description: "Aktifkan dari Pengaturan iPhone → STROBAN, lalu coba lagi.",
        });
      } else {
        toast.error("Gagal mendaftarkan perangkat", { description: result.reason || "Coba install PWA dari domain resmi." });
      }
    } finally {
      setRegistering(false);
    }
  };

  const sendTest = async () => {
    if (!user) return;
    setSendingTest(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          title: "Tes Notifikasi",
          message: "Jika Anda melihat ini di luar tab, push notifikasi PWA bekerja dengan baik.",
          type: "verification",
          metadata: { redirect_to: "/dashboard/pwa-settings" },
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: fnErr } = await supabase.functions.invoke("dispatch-notification", {
        body: { notification_id: data.id },
      });
      if (fnErr) throw fnErr;
      toast.success("Notifikasi tes dikirim", {
        description: "Cek bayangan notifikasi HP Anda dalam beberapa detik.",
      });
    } catch (e: any) {
      toast.error("Gagal mengirim notifikasi tes", { description: e.message });
    } finally {
      setSendingTest(false);
    }
  };

  const playPreview = () => {
    try {
      const audio = new Audio(
        form.notification_sound_url ||
          `https://actions.google.com/sounds/v1/alarms/${form.default_ringtone === "chime" ? "gentle_alarm" : form.default_ringtone === "bell" ? "bugle_tune" : form.default_ringtone === "ding" ? "alarm_clock" : "beep_short"}.ogg`,
      );
      audio.volume = 0.6;
      audio.play().catch(() => toast.error("Browser memblokir auto-play"));
    } catch {}
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
          <CardTitle>Status Perangkat Ini</CardTitle>
          <CardDescription>
            Informasi real-time apakah PWA terinstall, izin notifikasi, dan token push tersimpan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DeviceStat
              icon={isInstalled ? <CheckCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              label="Status Install"
              value={isInstalled ? "Sudah terinstall" : "Belum terinstall"}
              ok={isInstalled}
            />
            <DeviceStat
              icon={permission === "granted" ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              label="Izin Notifikasi"
              value={permission}
              ok={permission === "granted"}
            />
            <DeviceStat
              icon={<Smartphone className="h-4 w-4" />}
              label="Token Terdaftar"
              value={tokenCount === null ? "…" : `${tokenCount} perangkat`}
              ok={(tokenCount ?? 0) > 0}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DeviceStat
              icon={<BadgeCheck className="h-4 w-4" />}
              label="Badging API"
              value={badgingSupported ? "Didukung" : "Tidak didukung"}
              ok={badgingSupported}
            />
            <DeviceStat
              icon={isInstalled ? <CheckCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              label="Mode Standalone"
              value={isInstalled ? "Aktif" : "Non-aktif"}
              ok={isInstalled}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={requestPerm} variant="default" disabled={registering}>
              {registering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
              {permission === "granted" && (tokenCount ?? 0) > 0
                ? "Daftarkan ulang perangkat ini"
                : "Aktifkan & Daftarkan Perangkat"}
            </Button>
            <Button onClick={sendTest} variant="outline" disabled={sendingTest || !user}>
              {sendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Kirim Notifikasi Tes
            </Button>
            {badgingSupported && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await (navigator as any).setAppBadge(5);
                    toast.success("Badge 5 di-set di ikon. Cek home screen.", {
                      description: "Akan otomatis hilang 10 detik.",
                    });
                    setTimeout(() => (navigator as any).clearAppBadge?.().catch?.(() => {}), 10000);
                  } catch (e: any) {
                    toast.error("Gagal set badge", { description: e.message });
                  }
                }}
              >
                <BadgeCheck className="h-4 w-4 mr-2" /> Tes Badge
              </Button>
            )}
          </div>
          {!isInstalled ? (
            <p className="text-xs text-muted-foreground">
              Banner install tidak muncul karena perangkat ini belum/terdeteksi sudah terinstall.
              Buka halaman publik di browser (bukan dari home screen) untuk melihat banner.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Tip iPhone: jika notifikasi/badge belum muncul, buka <b>Settings → Notifications → STROBAN</b>{" "}
              dan aktifkan <b>Allow Notifications</b>, <b>Lock Screen</b>, <b>Banners</b>, dan <b>Badges</b>.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Push Notification</CardTitle>
          <CardDescription>
            Ringkasan sinkronisasi token, trigger notifikasi, dan hasil pengiriman push terbaru.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <DeviceStat icon={<Smartphone className="h-4 w-4" />} label="Token Aktif" value={pushAudit?.active_tokens ?? 0} ok={(pushAudit?.active_tokens ?? 0) > 0} />
            <DeviceStat icon={<XCircle className="h-4 w-4" />} label="Token Invalid" value={pushAudit?.invalid_tokens ?? 0} ok={(pushAudit?.invalid_tokens ?? 0) === 0} />
            <DeviceStat icon={<CheckCircle2 className="h-4 w-4" />} label="Scope Audit" value={pushAudit?.scope ?? "-"} ok={Boolean(pushAudit?.scope)} />
            <DeviceStat icon={<Send className="h-4 w-4" />} label="Push Terakhir" value={formatAuditTime(pushAudit?.last_push_sent)} ok={Boolean(pushAudit?.last_push_sent)} />
            <DeviceStat icon={<CheckCheck className="h-4 w-4" />} label="Push Sukses" value={formatAuditTime(pushAudit?.last_push_success)} ok={Boolean(pushAudit?.last_push_success)} />
            <DeviceStat icon={<AlertTriangle className="h-4 w-4" />} label="Push Gagal" value={formatAuditTime(pushAudit?.last_push_failed)} ok={!pushAudit?.last_push_failed} />
            <DeviceStat icon={<Bell className="h-4 w-4" />} label="Trigger Terakhir" value={formatAuditTime(pushAudit?.last_notification_trigger)} ok={Boolean(pushAudit?.last_notification_trigger)} />
            <DeviceStat icon={<RotateCcw className="h-4 w-4" />} label="Device Sync" value={formatAuditTime(pushAudit?.last_device_sync)} ok={Boolean(pushAudit?.last_device_sync)} />
            <DeviceStat icon={<Monitor className="h-4 w-4" />} label="Platform Aktif" value={Object.keys(pushAudit?.by_platform ?? {}).length || 0} ok={Boolean(Object.keys(pushAudit?.by_platform ?? {}).length)} />
          </div>
        </CardContent>
      </Card>

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
          <CardTitle>Pengaturan Notifikasi Global</CardTitle>
          <CardDescription>
            Berlaku untuk semua pengguna. Pengguna bisa override ringtone & getar dari profilnya.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Aktifkan push notification</Label>
              <p className="text-xs text-muted-foreground">
                Mematikan akan menahan notifikasi background di SW untuk semua pengguna.
              </p>
            </div>
            <Switch
              checked={form.notification_enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, notification_enabled: v }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Preset ringtone default</Label>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={form.default_ringtone}
                onChange={(e) => setForm((f) => ({ ...f, default_ringtone: e.target.value }))}
              >
                <option value="default">Default (suara sistem)</option>
                <option value="chime">Chime — lembut</option>
                <option value="bell">Bell — klasik</option>
                <option value="ding">Ding — pendek</option>
                <option value="silent">Silent (tanpa suara)</option>
              </select>
              <Button type="button" variant="outline" size="sm" onClick={playPreview} className="w-fit">
                Preview suara
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Getar default</Label>
                <p className="text-xs text-muted-foreground">Pola getar 200-100-200 ms.</p>
              </div>
              <Switch
                checked={form.default_vibrate}
                onCheckedChange={(v) => setForm((f) => ({ ...f, default_vibrate: v }))}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>URL ikon notifikasi (opsional)</Label>
            <Input
              placeholder="https://… (192x192 PNG)"
              value={form.notification_icon_url}
              onChange={(e) => setForm((f) => ({ ...f, notification_icon_url: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Kosongkan untuk pakai logo brand bawaan.</p>
          </div>

          <div className="grid gap-1.5">
            <Label>URL file ringtone custom (opsional)</Label>
            <Input
              placeholder="https://… (.mp3 / .ogg)"
              value={form.notification_sound_url}
              onChange={(e) => setForm((f) => ({ ...f, notification_sound_url: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Diputar saat aplikasi/tab terbuka. Di layar kunci Android, suara mengikuti channel sistem.
            </p>
          </div>

          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Simpan Pengaturan Notifikasi
          </Button>
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

const DeviceStat = ({
  icon, label, value, ok,
}: { icon: React.ReactNode; label: string; value: string | number; ok: boolean }) => (
  <div className={`rounded-lg border p-3 ${ok ? "bg-emerald-500/5 border-emerald-500/30" : "bg-amber-500/5 border-amber-500/30"}`}>
    <div className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
      {icon} <span className="font-medium uppercase tracking-wide">{label}</span>
    </div>
    <div className="mt-1 text-base font-semibold capitalize">{value}</div>
  </div>
);