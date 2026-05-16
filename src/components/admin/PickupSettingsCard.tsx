import { useEffect, useState } from "react";
import { Loader2, Truck, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_PICKUP_SETTINGS, fetchPickupSettings, type PickupSettings } from "@/lib/pickupSettings";

export default function PickupSettingsCard() {
  const [s, setS] = useState<PickupSettings>(DEFAULT_PICKUP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPickupSettings().then((v) => { setS(v); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "pickup_service", value: s as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSaving(false);
    if (error) { toast.error("Gagal menyimpan", { description: error.message }); return; }
    toast.success("Pengaturan pick-up disimpan");
  };

  if (loading) {
    return (
      <Card><CardContent className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-purple-600" /> Pick-up Service
        </CardTitle>
        <CardDescription>
          Atur ketersediaan, jangkauan, dan biaya layanan jemput-antar mobil ke lokasi pelanggan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium text-sm">Aktifkan Pick-up Service</p>
            <p className="text-xs text-muted-foreground">Saat aktif, pelanggan dapat memilih opsi pick-up di halaman booking.</p>
          </div>
          <Switch checked={s.enabled} onCheckedChange={(v) => setS({ ...s, enabled: v })} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="max-dist">Jarak maksimum (km)</Label>
            <Input
              id="max-dist" type="number" min={1} step="0.5"
              value={s.max_distance_km}
              onChange={(e) => setS({ ...s, max_distance_km: Number(e.target.value) || 0 })}
            />
            <p className="text-[11px] text-muted-foreground">Pelanggan tidak bisa booking pick-up jika jarak melebihi nilai ini.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Mode Tarif</Label>
            <RadioGroup
              value={s.fee_mode}
              onValueChange={(v) => setS({ ...s, fee_mode: v as "flat" | "per_km" })}
              className="flex gap-2"
            >
              <label className={`flex-1 flex items-center gap-2 rounded-lg border p-2 cursor-pointer text-sm ${s.fee_mode === "flat" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="flat" id="fee-flat" />
                <span>Flat (tetap)</span>
              </label>
              <label className={`flex-1 flex items-center gap-2 rounded-lg border p-2 cursor-pointer text-sm ${s.fee_mode === "per_km" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="per_km" id="fee-perkm" />
                <span>Per Kilometer</span>
              </label>
            </RadioGroup>
          </div>
        </div>

        {s.fee_mode === "flat" ? (
          <div className="grid sm:grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="base-fee">Biaya jemput (Rp)</Label>
              <Input
                id="base-fee" type="number" min={0} step="1000"
                value={s.base_fee}
                onChange={(e) => setS({ ...s, base_fee: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ret-fee">Biaya antar pulang (Rp)</Label>
              <Input
                id="ret-fee" type="number" min={0} step="1000"
                value={s.return_fee}
                onChange={(e) => setS({ ...s, return_fee: Number(e.target.value) || 0 })}
              />
              <p className="text-[11px] text-muted-foreground">Berlaku jika pelanggan memilih sekalian diantar setelah selesai.</p>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="pkm-fee">Tarif jemput per km (Rp/km)</Label>
              <Input
                id="pkm-fee" type="number" min={0} step="500"
                value={s.pickup_per_km_fee}
                onChange={(e) => setS({ ...s, pickup_per_km_fee: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkm-min">Minimum biaya jemput (Rp)</Label>
              <Input
                id="pkm-min" type="number" min={0} step="1000"
                value={s.min_pickup_fee}
                onChange={(e) => setS({ ...s, min_pickup_fee: Number(e.target.value) || 0 })}
              />
              <p className="text-[11px] text-muted-foreground">Tarif minimal walaupun jarak pendek.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rkm-fee">Tarif antar pulang per km (Rp/km)</Label>
              <Input
                id="rkm-fee" type="number" min={0} step="500"
                value={s.return_per_km_fee}
                onChange={(e) => setS({ ...s, return_per_km_fee: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rkm-min">Minimum biaya antar pulang (Rp)</Label>
              <Input
                id="rkm-min" type="number" min={0} step="1000"
                value={s.min_return_fee}
                onChange={(e) => setS({ ...s, min_return_fee: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Pengaturan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
