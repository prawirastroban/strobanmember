import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wrench, Save } from "lucide-react";

const MaintenanceModePanel = () => {
  const [active, setActive] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [estimatedEnd, setEstimatedEnd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings").select("value").eq("key", "maintenance_mode").maybeSingle();
      const v = (data?.value as Record<string, unknown> | null) ?? {};
      setActive(Boolean(v.active));
      setReason(String(v.reason ?? ""));
      setMessage(String(v.message ?? ""));
      setEstimatedEnd(String(v.estimated_end ?? ""));
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const value = { active, reason, message, estimated_end: estimatedEnd };
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "maintenance_mode", value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(active ? "Maintenance AKTIF" : "Maintenance dimatikan");
  };

  return (
    <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-5 w-5 text-yellow-500" /> Maintenance Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-muted/30 p-3">
          <div>
            <div className="font-medium text-sm">Aktifkan Maintenance</div>
            <div className="text-xs text-muted-foreground">Owner & Staff tetap bisa mengakses sistem.</div>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        <div className="space-y-2">
          <Label>Pesan ke User</Label>
          <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Sedang melakukan pemeliharaan..." />
        </div>
        <div className="space-y-2">
          <Label>Alasan Maintenance</Label>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Upgrade database & deployment versi baru" />
        </div>
        <div className="space-y-2">
          <Label>Estimasi Selesai</Label>
          <Input type="datetime-local" value={estimatedEnd} onChange={e => setEstimatedEnd(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-red-500 to-yellow-400 text-white">
          <Save className="h-4 w-4 mr-2" /> Simpan
        </Button>
      </CardContent>
    </Card>
  );
};

export default MaintenanceModePanel;