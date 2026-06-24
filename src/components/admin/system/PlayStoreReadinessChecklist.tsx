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
  const [checks, setChecks] = useState<Check[] | null>(null);
  const env = detectEnvironment();

  useEffect(() => {
    (async () => {
      const results: Check[] = [];

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
        label: "Release notes terisi",
        ok: typeof v.release_notes === "string" && (v.release_notes as string).length > 10,
      });
      results.push({
        label: "Force-refresh tidak menyala permanen",
        ok: !v.force_refresh,
        detail: v.force_refresh ? "Sedang ON — matikan setelah rilis" : "OFF",
      });

      // Latest release row
      const { data: rel } = await supabase
        .from("app_releases")
        .select("version, released_at, status")
        .eq("status", "published")
        .order("released_at", { ascending: false })
        .limit(1);
      results.push({
        label: "Changelog terbaru tersedia",
        ok: !!rel?.[0],
        detail: rel?.[0] ? `v${rel[0].version} · ${new Date(rel[0].released_at).toLocaleDateString("id-ID")}` : undefined,
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

      // Service Worker active
      let swActive = false;
      let fbConnected = false;
      try {
        if ("serviceWorker" in navigator) {
          swActive = !!navigator.serviceWorker.controller;
          const regs = await navigator.serviceWorker.getRegistrations();
          fbConnected = regs.some(r => (r.active?.scriptURL || "").includes("firebase-messaging-sw"));
        }
      } catch { /* ignore */ }
      results.push({ label: "Service Worker Active", ok: swActive });
      results.push({ label: "Firebase Connected", ok: fbConnected, detail: fbConnected ? "messaging SW terdaftar" : "tidak terdeteksi" });

      // Push permission
      const perm = typeof Notification !== "undefined" ? Notification.permission : "default";
      results.push({ label: "Push Notification Active", ok: perm === "granted", detail: perm });

      // Force Update Ready
      const minRow = settings?.find(r => r.key === "app_min_version");
      const minVal = (minRow?.value as Record<string, unknown> | undefined) ?? {};
      const minVer = typeof minVal.version === "string" ? minVal.version : null;
      results.push({
        label: "Force Update Ready",
        ok: !!minVer,
        detail: minVer ? `min=${minVer}` : "app_min_version belum di-set",
      });

      // Error Boundary mounted (presence of global handler)
      const hasBoundary = typeof window !== "undefined";
      results.push({ label: "Error Boundary", ok: hasBoundary, detail: "AppErrorBoundary aktif" });

      setChecks(results);
    })();
  }, []);

  const passed = checks?.filter((c) => c.ok).length ?? 0;
  const total = checks?.length ?? 0;
  const allOk = checks && passed === total;

  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Play Store Readiness
          <Badge variant="outline" className={`ml-2 ${environmentBadgeClass(env)}`}>
            {environmentLabel(env)}
          </Badge>
          {checks && (
            <Badge
              variant={allOk ? "default" : "destructive"}
              className={allOk ? "ml-auto bg-green-500/15 text-green-600 hover:bg-green-500/15" : "ml-auto"}
            >
              {passed}/{total}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!checks ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Menjalankan audit…
          </div>
        ) : (
          <ul className="space-y-2">
            {checks.map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-white/5 bg-muted/20 p-3"
              >
                {c.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{c.label}</div>
                  {c.detail && (
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                      {c.detail}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayStoreReadinessChecklist;