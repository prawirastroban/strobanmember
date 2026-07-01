import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Rocket, FileText, ScanLine, ShieldCheck, Zap, Bell, Smartphone,
} from "lucide-react";
import AppVersionManager from "@/components/admin/AppVersionManager";
import ReleaseNotesManager from "@/components/admin/system/ReleaseNotesManager";
import SystemAuditPanel from "@/components/admin/system/SystemAuditPanel";
import PlayStoreReadinessChecklist from "@/components/admin/system/PlayStoreReadinessChecklist";
import ForceRefreshCenter from "@/components/admin/system/ForceRefreshCenter";
import NotificationAuditPanel from "@/components/admin/system/NotificationAuditPanel";
import PWAAuditPanel from "@/components/admin/system/PWAAuditPanel";
import { detectEnvironment, environmentBadgeClass, environmentLabel } from "@/lib/environment";

const MaintenanceCenterHub = () => {
  const [params] = useSearchParams();
  const initial = params.get("tab") || "version";
  const [tab, setTab] = useState(initial);
  const env = detectEnvironment();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={environmentBadgeClass(env)}>
          ENV: {environmentLabel(env)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Pusat maintenance, audit, force refresh, dan kesiapan Play Store
        </span>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1">
          <TabsTrigger value="version" className="gap-1.5"><Rocket className="h-3.5 w-3.5" />Application Version</TabsTrigger>
          <TabsTrigger value="release-notes" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Release Notes</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><ScanLine className="h-3.5 w-3.5" />System Audit</TabsTrigger>
          <TabsTrigger value="playstore" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Play Store Readiness</TabsTrigger>
          <TabsTrigger value="force" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Force Refresh</TabsTrigger>
          <TabsTrigger value="notif" className="gap-1.5"><Bell className="h-3.5 w-3.5" />Notification Audit</TabsTrigger>
          <TabsTrigger value="pwa" className="gap-1.5"><Smartphone className="h-3.5 w-3.5" />PWA Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="version" className="mt-0"><AppVersionManager /></TabsContent>
        <TabsContent value="release-notes" className="mt-0"><ReleaseNotesManager /></TabsContent>
        <TabsContent value="audit" className="mt-0"><SystemAuditPanel /></TabsContent>
        <TabsContent value="playstore" className="mt-0"><PlayStoreReadinessChecklist /></TabsContent>
        <TabsContent value="force" className="mt-0"><ForceRefreshCenter /></TabsContent>
        <TabsContent value="notif" className="mt-0"><NotificationAuditPanel /></TabsContent>
        <TabsContent value="pwa" className="mt-0"><PWAAuditPanel /></TabsContent>
      </Tabs>
    </div>
  );
};

export default MaintenanceCenterHub;