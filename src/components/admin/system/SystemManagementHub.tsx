import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { LayoutDashboard, Rocket, Wrench } from "lucide-react";
import SystemManagementCenter from "@/components/admin/system-center/SystemManagementCenter";
import AppVersionManager from "@/components/admin/AppVersionManager";
import ReleaseNotesManager from "@/components/admin/system/ReleaseNotesManager";
import MaintenanceModePanel from "@/components/admin/system/MaintenanceModePanel";
import UserSessionsPanel from "@/components/admin/system/UserSessionsPanel";
import CacheManagementPanel from "@/components/admin/system/CacheManagementPanel";
import DeploymentHistoryPanel from "@/components/admin/system/DeploymentHistoryPanel";
import SystemAuditPanel from "@/components/admin/system/SystemAuditPanel";
import PlayStoreReadinessChecklist from "@/components/admin/system/PlayStoreReadinessChecklist";
import ForceRefreshCenter from "@/components/admin/system/ForceRefreshCenter";
import NotificationAuditPanel from "@/components/admin/system/NotificationAuditPanel";
import PWAAuditPanel from "@/components/admin/system/PWAAuditPanel";
import PwaSettingsManager from "@/components/admin/PwaSettingsManager";
import { detectEnvironment, environmentBadgeClass, environmentLabel } from "@/lib/environment";

/** 3 tab: Ringkasan (refresh + maintenance), Rilis, Lanjutan (dilipat). */
const LEGACY_TAB_MAP: Record<string, string> = {
  overview: "ringkasan", dashboard: "ringkasan", "update-center": "ringkasan",
  operations: "ringkasan", maintenance: "ringkasan", force: "ringkasan",
  spk: "ringkasan", "spk-config": "ringkasan",
  deployment: "rilis", version: "rilis", "release-notes": "rilis", history: "rilis",
  clients: "lanjutan", sessions: "lanjutan", notif: "lanjutan", cache: "lanjutan",
  audit: "lanjutan", playstore: "lanjutan", pwa: "lanjutan", "pwa-settings": "lanjutan", install: "lanjutan",
};
const VALID_TABS = new Set(["ringkasan", "rilis", "lanjutan"]);

const ADVANCED = [
  { v: "cache", t: "Cache", c: <CacheManagementPanel /> },
  { v: "sessions", t: "Sesi Pengguna", c: <UserSessionsPanel /> },
  { v: "notif", t: "Audit Notifikasi", c: <NotificationAuditPanel /> },
  { v: "audit", t: "Audit Sistem", c: <SystemAuditPanel /> },
  { v: "overview", t: "Status Sistem Detail", c: <SystemManagementCenter /> },
  { v: "pwa-settings", t: "PWA & Install", c: <PwaSettingsManager /> },
  { v: "playstore", t: "Play Store Checklist", c: <PlayStoreReadinessChecklist /> },
  { v: "pwa", t: "PWA Audit", c: <PWAAuditPanel /> },
];

const SystemManagementHub = () => {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") || "ringkasan";
  const initial = VALID_TABS.has(raw) ? raw : (LEGACY_TAB_MAP[raw] ?? "ringkasan");
  const [tab, setTab] = useState(initial);
  const env = detectEnvironment();

  const onTabChange = (v: string) => {
    setTab(v);
    const next = new URLSearchParams(params);
    next.set("tab", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <Badge variant="outline" className={environmentBadgeClass(env)}>
        ENV: {environmentLabel(env)}
      </Badge>
      <Tabs value={tab} onValueChange={onTabChange} className="space-y-4">
        <TabsList className="grid grid-cols-3 h-auto gap-1 bg-muted/40 p-1">
          <TabsTrigger value="ringkasan" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" />Ringkasan</TabsTrigger>
          <TabsTrigger value="rilis" className="gap-1.5"><Rocket className="h-3.5 w-3.5" />Rilis</TabsTrigger>
          <TabsTrigger value="lanjutan" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Lanjutan</TabsTrigger>
        </TabsList>

        <TabsContent value="ringkasan" className="mt-0 space-y-4">
          <ForceRefreshCenter />
          <MaintenanceModePanel />
        </TabsContent>

        <TabsContent value="rilis" className="mt-0 space-y-4">
          <AppVersionManager />
          <ReleaseNotesManager />
          <DeploymentHistoryPanel />
        </TabsContent>

        <TabsContent value="lanjutan" className="mt-0">
          <Accordion type="multiple" className="rounded-xl border border-border bg-card/60 backdrop-blur-xl px-4">
            {ADVANCED.map((a, i) => (
              <AccordionItem key={a.v} value={a.v} className={i === ADVANCED.length - 1 ? "border-b-0" : ""}>
                <AccordionTrigger className="text-sm">{a.t}</AccordionTrigger>
                <AccordionContent>{a.c}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemManagementHub;
