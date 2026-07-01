import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  LayoutDashboard, Rocket, Settings2, Users, ShieldCheck, ExternalLink,
} from "lucide-react";
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
import { detectEnvironment, environmentBadgeClass, environmentLabel } from "@/lib/environment";

/**
 * 5 tab utama: Overview -> Deployment -> Operations -> Clients -> Audit.
 * Panel pasif (Play Store, PWA) dipindah ke accordion agar tetap accessible
 * tanpa memakan slot tab utama. Legacy query params tetap didukung.
 */
const LEGACY_TAB_MAP: Record<string, string> = {
  dashboard: "overview",
  "update-center": "overview",
  version: "deployment",
  "release-notes": "deployment",
  history: "deployment",
  maintenance: "operations",
  cache: "operations",
  force: "operations",
  sessions: "clients",
  notif: "clients",
  playstore: "audit",
  pwa: "audit",
};
const VALID_TABS = new Set(["overview", "deployment", "operations", "clients", "audit"]);

const SystemManagementHub = () => {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") || "overview";
  const initial = VALID_TABS.has(raw) ? raw : (LEGACY_TAB_MAP[raw] ?? "overview");
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
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={environmentBadgeClass(env)}>
          ENV: {environmentLabel(env)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Overview → Deployment → Operations → Clients → Audit
        </span>
      </div>
      <Tabs value={tab} onValueChange={onTabChange} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto gap-1 bg-muted/40 p-1">
          <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="deployment" className="gap-1.5"><Rocket className="h-3.5 w-3.5" />Deployment</TabsTrigger>
          <TabsTrigger value="operations" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" />Operations</TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5"><Users className="h-3.5 w-3.5" />Clients</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-4">
          <SystemManagementCenter />
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <a href="/update-center" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Buka Update Center (tampilan user)
              </a>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="deployment" className="mt-0">
          <Tabs defaultValue="version" className="space-y-3">
            <TabsList className="bg-muted/40">
              <TabsTrigger value="version">Versi Aplikasi</TabsTrigger>
              <TabsTrigger value="notes">Release Notes</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="version" className="mt-0"><AppVersionManager /></TabsContent>
            <TabsContent value="notes" className="mt-0"><ReleaseNotesManager /></TabsContent>
            <TabsContent value="history" className="mt-0"><DeploymentHistoryPanel /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="operations" className="mt-0 space-y-4">
          <MaintenanceModePanel />
          <CacheManagementPanel />
          <ForceRefreshCenter />
        </TabsContent>

        <TabsContent value="clients" className="mt-0 space-y-4">
          <UserSessionsPanel />
          <NotificationAuditPanel />
        </TabsContent>

        <TabsContent value="audit" className="mt-0 space-y-4">
          <SystemAuditPanel />
          <Accordion type="multiple" className="rounded-xl border border-white/10 bg-card/60 backdrop-blur-xl px-4">
            <AccordionItem value="playstore" className="border-white/10">
              <AccordionTrigger className="text-sm">Play Store Readiness Checklist</AccordionTrigger>
              <AccordionContent><PlayStoreReadinessChecklist /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="pwa" className="border-b-0">
              <AccordionTrigger className="text-sm">PWA Audit</AccordionTrigger>
              <AccordionContent><PWAAuditPanel /></AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemManagementHub;