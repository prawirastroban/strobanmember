import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface AddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onSaved: () => void;
}

const emptyForm = {
  brand: "", model: "", year: "", license_plate: "",
  tire_size: "", transmission: "", fuel_type: "",
};

const AddVehicleDialog = ({ open, onOpenChange, customerId, onSaved }: AddVehicleDialogProps) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setForm(emptyForm);
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!form.brand || !form.model || !form.license_plate) {
      toast({ variant: "destructive", title: "Brand, Model, and Plate are required" });
      return;
    }
    setSaving(true);

    const plateUpper = form.license_plate.toUpperCase().trim();
    const { data: existing } = await supabase
      .from("vehicles")
      .select("id,user_id")
      .ilike("license_plate", plateUpper)
      .limit(1)
      .maybeSingle();
    if (existing) {
      const sameUser = (existing as any).user_id === customerId;
      toast({
        variant: "destructive",
        title: sameUser ? "Plat sudah terdaftar" : "Plat sudah dipakai customer lain",
        description: sameUser
          ? "Kendaraan dengan plat ini sudah ada di akun customer ini."
          : "Hubungi admin untuk verifikasi kepemilikan kendaraan.",
      });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("vehicles").insert({
      brand: form.brand,
      model: form.model,
      year: form.year ? parseInt(form.year) : null,
      license_plate: plateUpper,
      tire_size: form.tire_size || null,
      transmission: form.transmission || null,
      fuel_type: form.fuel_type || null,
      user_id: customerId,
    });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Vehicle added" });
      onOpenChange(false);
      onSaved();
    }
    setSaving(false);
  };

  const fields = [
    { key: "brand", label: "Brand", required: true },
    { key: "model", label: "Model", required: true },
    { key: "year", label: "Year", required: false },
    { key: "license_plate", label: "License Plate", required: true },
    { key: "tire_size", label: "Tire Size", required: false },
    { key: "transmission", label: "Transmission", required: false },
    { key: "fuel_type", label: "Fuel Type", required: false },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Vehicle</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {fields.map((f) => (
            <div key={f.key} className="grid gap-2">
              <Label>{f.label} {f.required && <span className="text-destructive">*</span>}</Label>
              <Input
                value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.label}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Vehicle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddVehicleDialog;
