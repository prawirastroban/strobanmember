import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rocket, Wrench, FileText, History, ScanLine, Users, Database, Megaphone, LayoutDashboard } from "lucide-react";
import SystemDashboardPanel from "@/components/admin/system/SystemDashboardPanel";
import AppVersionManager from "@/components/admin/AppVersionManager";
import ReleaseNotesManager from "@/components/admin/system/ReleaseNotesManager";
import MaintenanceModePanel from "@/components/admin/system/MaintenanceModePanel";
import UserSessionsPanel from "@/components/admin/system/UserSessionsPanel";
import CacheManagementPanel from "@/components/admin/system/CacheManagementPanel";
import DeploymentHistoryPanel from "@/components/admin/system/DeploymentHistoryPanel";
import SystemAuditPanel from "@/components/admin/system/SystemAuditPanel";
import UpdateCenterPreview from "@/components/admin/system/UpdateCenterPreview";

const SystemManagementHub = () => {
  const [tab, setTab] = useState("dashboard");
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1">
        <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</TabsTrigger>
        <TabsTrigger value="version" className="gap-1.5"><Rocket className="h-3.5 w-3.5" />Versi Aplikasi</TabsTrigger>
        <TabsTrigger value="maintenance" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Maintenance</TabsTrigger>
        <TabsTrigger value="release-notes" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Release Notes</TabsTrigger>
        <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" />Deployment History</TabsTrigger>
        <TabsTrigger value="audit" className="gap-1.5"><ScanLine className="h-3.5 w-3.5" />System Audit</TabsTrigger>
        <TabsTrigger value="sessions" className="gap-1.5"><Users className="h-3.5 w-3.5" />User Sessions</TabsTrigger>
        <TabsTrigger value="cache" className="gap-1.5"><Database className="h-3.5 w-3.5" />Cache</TabsTrigger>
        <TabsTrigger value="update-center" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" />Update Center</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="mt-0"><SystemDashboardPanel /></TabsContent>
      <TabsContent value="version" className="mt-0"><AppVersionManager /></TabsContent>
      <TabsContent value="maintenance" className="mt-0"><MaintenanceModePanel /></TabsContent>
      <TabsContent value="release-notes" className="mt-0"><ReleaseNotesManager /></TabsContent>
      <TabsContent value="history" className="mt-0"><DeploymentHistoryPanel /></TabsContent>
      <TabsContent value="audit" className="mt-0"><SystemAuditPanel /></TabsContent>
      <TabsContent value="sessions" className="mt-0"><UserSessionsPanel /></TabsContent>
      <TabsContent value="cache" className="mt-0"><CacheManagementPanel /></TabsContent>
      <TabsContent value="update-center" className="mt-0"><UpdateCenterPreview /></TabsContent>
    </Tabs>
  );
};

export default SystemManagementHub;