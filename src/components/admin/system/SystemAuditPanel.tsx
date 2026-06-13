import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanLine } from "lucide-react";
import PageAuditPanel from "@/components/admin/PageAuditPanel";

const SystemAuditPanel = () => (
  <div className="space-y-4">
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScanLine className="h-5 w-5 text-primary" /> System Audit
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Pemeriksaan otomatis: broken pages, dead routes, missing permissions, duplicate pages, version mismatch & cache conflict.
        </p>
      </CardContent>
    </Card>
    <PageAuditPanel />
  </div>
);

export default SystemAuditPanel;