import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rocket, Wrench, FileText, History, ScanLine, Users, Database, Megaphone } from "lucide-react";
import AppVersionManager from "@/components/admin/AppVersionManager";
import ReleaseNotesManager from "@/components/admin/system/ReleaseNotesManager";

const SystemManagementHub = () => {
  const [tab, setTab] = useState("version");
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1">
        <TabsTrigger value="version" className="gap-1.5"><Rocket className="h-3.5 w-3.5" />Versi Aplikasi</TabsTrigger>
        <TabsTrigger value="maintenance" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Maintenance</TabsTrigger>
        <TabsTrigger value="release-notes" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Release Notes</TabsTrigger>
        <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" />Deployment History</TabsTrigger>
        <TabsTrigger value="audit" className="gap-1.5"><ScanLine className="h-3.5 w-3.5" />System Audit</TabsTrigger>
        <TabsTrigger value="sessions" className="gap-1.5"><Users className="h-3.5 w-3.5" />User Sessions</TabsTrigger>
        <TabsTrigger value="cache" className="gap-1.5"><Database className="h-3.5 w-3.5" />Cache</TabsTrigger>
        <TabsTrigger value="update-center" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" />Update Center</TabsTrigger>
      </TabsList>

      <TabsContent value="version" className="mt-0"><AppVersionManager /></TabsContent>
      <TabsContent value="release-notes" className="mt-0"><ReleaseNotesManager /></TabsContent>

      <TabsContent value="maintenance" className="mt-0">
        <ComingSoonCard title="Maintenance Mode" desc="Aktifkan halaman maintenance, set estimasi & alasan. (Fase 2)" />
      </TabsContent>
      <TabsContent value="history" className="mt-0">
        <ComingSoonCard title="Deployment History" desc="Riwayat publish, total user updated/pending. (Fase 3)" />
      </TabsContent>
      <TabsContent value="audit" className="mt-0">
        <ComingSoonCard title="System Audit" desc="Broken pages, dead routes, version mismatch, cache conflict. (Fase 3)" />
      </TabsContent>
      <TabsContent value="sessions" className="mt-0">
        <ComingSoonCard title="User Sessions" desc="User online, force logout / refresh / clear cache. (Fase 2)" />
      </TabsContent>
      <TabsContent value="cache" className="mt-0">
        <ComingSoonCard title="Cache Management" desc="Clear all / refresh all / rebuild / sync version. (Fase 2)" />
      </TabsContent>
      <TabsContent value="update-center" className="mt-0">
        <ComingSoonCard title="Update Center" desc="Preview feed perubahan untuk user. (Fase 3)" />
      </TabsContent>
    </Tabs>
  );
};

const ComingSoonCard = ({ title, desc }: { title: string; desc: string }) => (
  <div className="rounded-2xl border border-dashed border-white/15 bg-muted/20 p-8 text-center">
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{desc}</p>
  </div>
);

export default SystemManagementHub;