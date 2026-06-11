import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useReportTemplates } from "@/hooks/useReportTemplates";
import { useUserRole } from "@/hooks/useUserRole";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: "standard" | "builder";
  defaultName?: string;
  config: any;
  onSaved?: () => void;
}

export default function TemplateSaveDialog({ open, onOpenChange, kind, defaultName, config, onSaved }: Props) {
  const [name, setName] = useState(defaultName || "");
  const [isGlobal, setIsGlobal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { save } = useReportTemplates(kind);
  const { isStaff } = useUserRole();

  const onSave = async () => {
    if (!name.trim()) { toast.error("Nama template wajib diisi"); return; }
    setSaving(true);
    try {
      await save({ name: name.trim(), kind, config, is_global: isStaff ? isGlobal : false });
      toast.success("Template tersimpan");
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error("Gagal menyimpan", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Simpan Template</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nama template</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Revenue Bandung Mingguan" />
          </div>
          {isStaff && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Bagikan untuk semua admin</div>
                <div className="text-xs text-muted-foreground">Template global terlihat oleh Staff & Admin.</div>
              </div>
              <Switch checked={isGlobal} onCheckedChange={setIsGlobal} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}