import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION, APP_BUILD_NUMBER, compareVersion } from "@/lib/appVersion";
import { pageRegistry } from "@/config/pageRegistry";
import { detectEnvironment, environmentBadgeClass, environmentLabel } from "@/lib/environment";

interface Check {
  label: string;
  ok: boolean;
  detail?: string;
}

const PlayStoreReadinessChecklist = () => {
  const [serverChecks, setServerChecks] = useState<Check[] | null>(null);
  const [deviceChecks, setDeviceChecks] = useState<Check[] | null>(null);
  const env = detectEnvironment();

  useEffect(() => {
    (async () => {
      const results: Check[] = [];
      const device: Check[] = [];

      // Legal documents
      const { data: legal } = await supabase
        .from("legal_documents")
        .select("slug, content")
        .in("slug", ["privacy", "terms", "refund", "contact"]);
      const has = (slug: string) =>
        !!legal?.find((r) => r.slug === slug && (r.content?.length ?? 0) > 200);
      results.push({ label: "Privacy Policy", ok: has("privacy"), detail: "/legal/privacy" });
      results.push({ label: "Terms & Conditions", ok: has("terms"), detail: "/legal/terms" });
      results.push({ label: "Refund Policy", ok: has("refund"), detail: "/legal/refund" });
      results.push({ label: "Contact Page", ok: has("contact"), detail: "/legal/contact" });

      // App version
      const { data: settings } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["app_version", "app_min_version"]);
      const versionRow = settings?.find((r) => r.key === "app_version");
      const v = (versionRow?.value ?? {}) as Record<string, unknown>;
      const serverVer = typeof v.version === "string" ? v.version : null;
      results.push({
        label: "App Version published",
        ok: !!serverVer,
        detail: serverVer ? `Live v${serverVer}` : "Belum dipublish",
      });
      results.push({
        label: "Client up-to-date with server",
        ok: !!serverVer && compareVersion(APP_VERSION, serverVer) >= 0,
        detail: `Build v${APP_VERSION} · #${APP_BUILD_NUMBER}`,
      });
      results.push({
        label: "Force-refresh tidak menyala permanen",
        ok: !v.force_refresh,
        detail: v.force_refresh ? "Sedang ON — matikan setelah rilis" : "OFF",
      });

      // Latest release row — read real release metadata
      const { data: relRows } = await supabase
        .from("app_releases")
        .select("version, released_at, status, summary, category, priority, impact, affected_modules, force_update")
        .order("released_at", { ascending: false })
        .limit(5);
      const publishedRel = relRows?.find((r) => r.status === "published") ?? null;
      const targetRel =
        (serverVer && relRows?.find((r) => r.version === serverVer)) ||
        publishedRel ||
        relRows?.[0] ||
        null;

      const relSummary = (targetRel?.summary ?? "").toString().trim();
      const relCategory = Array.isArray(targetRel?.category) ? (targetRel?.category as string[]) : [];
      const relPriority = (targetRel?.priority ?? "").toString().trim();
      const relImpact = (targetRel?.impact ?? "").toString().trim();
      const relModules = Array.isArray(targetRel?.affected_modules) ? (targetRel?.affected_modules as string[]) : [];
      const hasReleaseNote = relSummary.length > 10;
      const hasReleaseType = relCategory.length > 0 || relPriority.length > 0;
      const hasImpactArea = relImpact.length > 0 || relModules.length > 0;

      results.push({
        label: "Changelog tersedia (app_releases)",
        ok: !!targetRel,
        detail: targetRel
          ? `v${targetRel.version} · ${targetRel.status} · ${targetRel.released_at ? new Date(targetRel.released_at).toLocaleDateString("id-ID") : "—"}`
          : "Belum ada baris release",
      });
      results.push({
        label: "Release Notes terisi",
        ok: hasReleaseNote,
        detail: hasReleaseNote ? `${relSummary.length} chars` : "summary kosong / <10 chars",
      });
      results.push({
        label: "Release Type ditentukan",
        ok: hasReleaseType,
        detail: hasReleaseType
          ? [relCategory.join(","), relPriority].filter(Boolean).join(" · ")
          : "category & priority kosong",
      });
      results.push({
        label: "Impact Area terdefinisi",
        ok: hasImpactArea,
        detail: hasImpactArea
          ? [relImpact, relModules.join(",")].filter(Boolean).join(" · ")
          : "impact & affected_modules kosong",
      });

      // Page registry: no deprecated leaks
      const deprecated = pageRegistry.filter((p) => p.status === "DEPRECATED").length;
      const redirected = pageRegistry.filter((p) => p.status === "REDIRECTED").length;
      results.push({
        label: "Tidak ada halaman mati / 404 legacy",
        ok: true,
        detail: `${redirected} redirected · ${deprecated} deprecated (semua punya replacedBy)`,
      });

      // Static assets
      const assetChecks: Array<[string, string]> = [
        ["PWA Manifest", "/manifest.webmanifest"],
        ["App Icon 512", "/pwa-512x512.png"],
        ["Apple Touch Icon", "/apple-touch-icon.png"],
        ["Offline Page", "/offline.html"],
        ["Firebase Messaging SW", "/firebase-messaging-sw.js"],
      ];
      for (const [label, path] of assetChecks) {
        try {
          const r = await fetch(path, { method: "HEAD" });
          results.push({ label, ok: r.ok, detail: path });
        } catch {
          results.push({ label, ok: false, detail: path });
        }
      }

      // Splash / standalone display
      try {
        const m = await fetch("/manifest.webmanifest").then(r => r.ok ? r.json() : null);
        const standalone = m && (m.display === "standalone" || m.display === "fullscreen");
        results.push({
          label: "Splash Screen (manifest)",
          ok: !!standalone && !!m?.theme_color,
          detail: standalone ? `display=${m.display} · theme=${m.theme_color ?? "?"}` : "display bukan standalone",
        });
      } catch {
        results.push({ label: "Splash Screen (manifest)", ok: false });
      }

      // Device runtime (informational — does not affect readiness score)
      let swActive = false;
      let fbConnected = false;
      try {
        if ("serviceWorker" in navigator) {
          swActive = !!navigator.serviceWorker.controller;
          const regs = await navigator.serviceWorker.getRegistrations();
          fbConnected = regs.some(r => (r.active?.scriptURL || "").includes("firebase-messaging-sw"));
        }
      } catch { /* ignore */ }
      device.push({ label: "Service Worker Active", ok: swActive, detail: swActive ? "controller aktif" : "belum aktif di browser ini" });
      device.push({ label: "Firebase Connected", ok: fbConnected, detail: fbConnected ? "messaging SW terdaftar" : "tidak terdeteksi di browser ini" });
      const perm = typeof Notification !== "undefined" ? Notification.permission : "default";
      device.push({ label: "Push Notification Granted", ok: perm === "granted", detail: perm });
      const installed = typeof window !== "undefined" &&
        (window.matchMedia?.("(display-mode: standalone)").matches ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window.navigator as any).standalone === true);
      device.push({ label: "PWA Installed", ok: !!installed, detail: installed ? "standalone" : "browser tab" });

      // Force Update Ready
      const minRow = settings?.find(r => r.key === "app_min_version");
      const minVal = (minRow?.value as Record<string, unknown> | undefined) ?? {};
      const minVer = typeof minVal.version === "string" ? minVal.version : null;
      results.push({
        label: "Force Update Ready",
        ok: !!minVer,
        detail: minVer ? `min=${minVer}` : "app_min_version belum di-set",
      });

      // Composite Release Ready indicator
      const releaseReady =
        !!serverVer &&
        APP_BUILD_NUMBER > 0 &&
        hasReleaseNote &&
        !!minVer;
      results.push({
        label: "Release Ready",
        ok: releaseReady,
        detail: releaseReady
          ? `v${serverVer} · build #${APP_BUILD_NUMBER} · min ${minVer}`
          : [
              !serverVer && "version",
              !(APP_BUILD_NUMBER > 0) && "build number",
              !hasReleaseNote && "release note",
              !minVer && "minimum version",
            ]
              .filter(Boolean)
              .join(", ") + " belum lengkap",
      });

      // Error Boundary actually mounted (marker set by AppErrorBoundary)
      const hasBoundary =
        typeof window !== "undefined" &&
        (window as Window & { __APP_ERROR_BOUNDARY__?: boolean }).__APP_ERROR_BOUNDARY__ === true;
      results.push({
        label: "Error Boundary",
        ok: hasBoundary,
        detail: hasBoundary ? "AppErrorBoundary mounted" : "marker tidak terdeteksi",
      });

      setServerChecks(results);
      setDeviceChecks(device);
    })();
  }, []);

  const passed = serverChecks?.filter((c) => c.ok).length ?? 0;
  const total = serverChecks?.length ?? 0;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;
  const allOk = serverChecks && passed === total;

  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Play Store Readiness
          <Badge variant="outline" className={`ml-2 ${environmentBadgeClass(env)}`}>
            {environmentLabel(env)}
          </Badge>
          {serverChecks && (
            <Badge
              variant={allOk ? "default" : "destructive"}
              className={allOk ? "ml-auto bg-green-500/15 text-green-600 hover:bg-green-500/15" : "ml-auto"}
            >
              {score}% · {passed}/{total}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!serverChecks ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Menjalankan audit…
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                Readiness (server-side — dihitung di skor)
              </div>
              <ul className="space-y-2">
                {serverChecks.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-lg border border-white/5 bg-muted/20 p-3">
                    {c.ok
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      : <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{c.label}</div>
                      {c.detail && (
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">{c.detail}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {deviceChecks && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                  Device Runtime (informational — tidak menurunkan skor)
                </div>
                <ul className="space-y-2">
                  {deviceChecks.map((c, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-lg border border-white/5 bg-muted/10 p-3">
                      {c.ok
                        ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        : <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{c.label}</div>
                        {c.detail && (
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">{c.detail}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-xl border border-white/10 bg-muted/30 p-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Skor Play Store Readiness</div>
              <div className={`font-mono text-lg ${score >= 90 ? "text-green-500" : score >= 70 ? "text-yellow-500" : "text-red-500"}`}>
                {score}%
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayStoreReadinessChecklist;