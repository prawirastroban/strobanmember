import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, Smartphone } from "lucide-react";

interface Check { label: string; ok: boolean; detail?: string; }

const PWAAuditPanel = () => {
  const [checks, setChecks] = useState<Check[] | null>(null);

  useEffect(() => {
    (async () => {
      const r: Check[] = [];
      // Manifest
      try {
        const m = await fetch("/manifest.webmanifest");
        const ok = m.ok;
        let detail = "";
        if (ok) {
          const j = await m.json();
          detail = `${j.name || j.short_name || "manifest"} · display=${j.display ?? "?"}`;
        }
        r.push({ label: "Manifest Valid", ok, detail });
      } catch { r.push({ label: "Manifest Valid", ok: false }); }

      // Service Worker Active
      let swActive = false;
      let swDetail = "";
      if ("serviceWorker" in navigator) {
        swActive = !!navigator.serviceWorker.controller;
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          swDetail = regs.map(x => (x.active?.scriptURL || "").split("/").pop()).filter(Boolean).join(", ");
        } catch { /* ignore */ }
      }
      r.push({ label: "Service Worker Active", ok: swActive, detail: swDetail || undefined });

      // PWA Installed (standalone)
      const installed = typeof window !== "undefined" &&
        (window.matchMedia?.("(display-mode: standalone)").matches ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window.navigator as any).standalone === true);
      r.push({ label: "PWA Installed", ok: !!installed, detail: installed ? "Standalone mode" : "Browser tab" });

      // Push Permission
      const perm = typeof Notification !== "undefined" ? Notification.permission : "default";
      r.push({ label: "Push Permission Granted", ok: perm === "granted", detail: perm });

      // Badge API
      const badgeOk = typeof navigator !== "undefined" && "setAppBadge" in navigator;
      r.push({ label: "Badge API Supported", ok: badgeOk });

      setChecks(r);
    })();
  }, []);

  const passed = checks?.filter(c => c.ok).length ?? 0;
  const total = checks?.length ?? 0;

  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="h-5 w-5 text-primary" />
          PWA Audit
          {checks && <Badge className="ml-auto" variant={passed === total ? "default" : "secondary"}>{passed}/{total}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!checks ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>
        ) : (
          <ul className="space-y-2">
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-white/5 bg-muted/20 p-3">
                {c.ok
                  ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{c.label}</div>
                  {c.detail && <div className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">{c.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PWAAuditPanel;