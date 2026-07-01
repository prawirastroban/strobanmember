import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Rocket, Wrench, FileText, History, ScanLine, Users, Database, Megaphone,
  LayoutDashboard, ShieldCheck, Zap, Bell, Smartphone,
} from "lucide-react";
import SystemManagementCenter from "@/components/admin/system-center/SystemManagementCenter";
import AppVersionManager from "@/components/admin/AppVersionManager";
import ReleaseNotesManager from "@/components/admin/system/ReleaseNotesManager";
import MaintenanceModePanel from "@/components/admin/system/MaintenanceModePanel";
import UserSessionsPanel from "@/components/admin/system/UserSessionsPanel";
import CacheManagementPanel from "@/components/admin/system/CacheManagementPanel";
import DeploymentHistoryPanel from "@/components/admin/system/DeploymentHistoryPanel";
import SystemAuditPanel from "@/components/admin/system/SystemAuditPanel";
import UpdateCenterPreview from "@/components/admin/system/UpdateCenterPreview";
import PlayStoreReadinessChecklist from "@/components/admin/system/PlayStoreReadinessChecklist";
import ForceRefreshCenter from "@/components/admin/system/ForceRefreshCenter";
import NotificationAuditPanel from "@/components/admin/system/NotificationAuditPanel";
import PWAAuditPanel from "@/components/admin/system/PWAAuditPanel";
import { detectEnvironment, environmentBadgeClass, environmentLabel } from "@/lib/environment";

/**
 * Pusat kontrol sistem tunggal. Menggabungkan seluruh fungsi yang sebelumnya
 * tersebar di `MaintenanceCenterHub` (Play Store, Force Refresh, Notif Audit,
 * PWA Audit) dan `SystemManagementCenter` (dashboard health) ke dalam satu hub.
 */
const SystemManagementHub = () => {
  const [params, setParams] = useSearchParams();
  const initial = params.get("tab") || "dashboard";
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
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={environmentBadgeClass(env)}>
          ENV: {environmentLabel(env)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Pusat kontrol lifecycle aplikasi: versi, deployment, maintenance, audit, cache
        </span>
      </div>
      <Tabs value={tab} onValueChange={onTabChange} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1">
          <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</TabsTrigger>
          <TabsTrigger value="version" className="gap-1.5"><Rocket className="h-3.5 w-3.5" />Versi Aplikasi</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Maintenance</TabsTrigger>
          <TabsTrigger value="release-notes" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Release Notes</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" />Deployment History</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><ScanLine className="h-3.5 w-3.5" />System Audit</TabsTrigger>
          <TabsTrigger value="playstore" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Play Store</TabsTrigger>
          <TabsTrigger value="force" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Force Refresh</TabsTrigger>
          <TabsTrigger value="notif" className="gap-1.5"><Bell className="h-3.5 w-3.5" />Notification Audit</TabsTrigger>
          <TabsTrigger value="pwa" className="gap-1.5"><Smartphone className="h-3.5 w-3.5" />PWA Audit</TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5"><Users className="h-3.5 w-3.5" />User Sessions</TabsTrigger>
          <TabsTrigger value="cache" className="gap-1.5"><Database className="h-3.5 w-3.5" />Cache</TabsTrigger>
          <TabsTrigger value="update-center" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" />Update Center</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0"><SystemManagementCenter /></TabsContent>
        <TabsContent value="version" className="mt-0"><AppVersionManager /></TabsContent>
        <TabsContent value="maintenance" className="mt-0"><MaintenanceModePanel /></TabsContent>
        <TabsContent value="release-notes" className="mt-0"><ReleaseNotesManager /></TabsContent>
        <TabsContent value="history" className="mt-0"><DeploymentHistoryPanel /></TabsContent>
        <TabsContent value="audit" className="mt-0"><SystemAuditPanel /></TabsContent>
        <TabsContent value="playstore" className="mt-0"><PlayStoreReadinessChecklist /></TabsContent>
        <TabsContent value="force" className="mt-0"><ForceRefreshCenter /></TabsContent>
        <TabsContent value="notif" className="mt-0"><NotificationAuditPanel /></TabsContent>
        <TabsContent value="pwa" className="mt-0"><PWAAuditPanel /></TabsContent>
        <TabsContent value="sessions" className="mt-0"><UserSessionsPanel /></TabsContent>
        <TabsContent value="cache" className="mt-0"><CacheManagementPanel /></TabsContent>
        <TabsContent value="update-center" className="mt-0"><UpdateCenterPreview /></TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemManagementHub;