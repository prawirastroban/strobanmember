import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, RefreshCw, Trash2, RotateCcw, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { APP_VERSION, hardReload } from "@/lib/appVersion";

const broadcast = async (action: string) => {
  const ch = supabase.channel("client_commands");
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); });
  });
  await ch.send({ type: "broadcast", event: "cmd", payload: { action, target: "*" } });
  await supabase.removeChannel(ch);
};

const CacheManagementPanel = () => {
  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-5 w-5 text-primary" /> Cache Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Versi Build" value={APP_VERSION} mono />
          <Stat label="Service Worker" value={typeof navigator !== "undefined" && "serviceWorker" in navigator ? "Aktif" : "—"} />
          <Stat label="Cache API" value={typeof caches !== "undefined" ? "Tersedia" : "—"} />
          <Stat label="Online" value={typeof navigator !== "undefined" && navigator.onLine ? "Ya" : "Tidak"} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Button variant="outline" onClick={async () => { await broadcast("clear_cache"); toast.success("Perintah Clear Cache terkirim"); }}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear All Cache
          </Button>
          <Button variant="outline" onClick={async () => { await broadcast("refresh"); toast.success("Refresh dipicu untuk semua client"); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh All Clients
          </Button>
          <Button variant="outline" onClick={async () => { await hardReload(); }}>
            <RotateCcw className="h-4 w-4 mr-2" /> Rebuild Cache (saya)
          </Button>
          <Button variant="outline" onClick={async () => { await broadcast("update"); toast.success("Sync Version dipicu"); }}>
            <Zap className="h-4 w-4 mr-2" /> Sync Version
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="rounded-xl border border-white/10 bg-muted/30 p-3">
    <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    <div className={`text-sm mt-1 ${mono ? "font-mono" : ""}`}>{value}</div>
  </div>
);

export default CacheManagementPanel;