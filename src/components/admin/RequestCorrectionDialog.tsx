import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  targetTable: "bookings" | "payments";
  field: "status" | "payment_status";
  fromValue: string;
  toValue: string;
  requesterRole?: string;
  customerLabel?: string;
}

export default function RequestCorrectionDialog({
  open, onOpenChange, bookingId, targetTable, field, fromValue, toValue, requesterRole, customerLabel,
}: Props) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 10) {
      toast.error("Alasan minimal 10 karakter");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("status_change_requests" as any).insert({
      booking_id: bookingId,
      requested_by: u?.user?.id,
      requester_role: requesterRole || null,
      target_table: targetTable,
      field,
      from_value: fromValue,
      to_value: toValue,
      reason: reason.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error("Gagal mengirim", { description: error.message });
      return;
    }
    toast.success("Permintaan koreksi terkirim", {
      description: "Owner akan meninjau dalam waktu dekat.",
    });
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Ajukan Koreksi ke Owner
          </DialogTitle>
          <DialogDescription>
            Perubahan status mundur dikunci untuk mencegah fraud. Owner akan meninjau permintaan ini sebelum perubahan diterapkan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {customerLabel && (
            <div className="rounded-md bg-muted/40 p-2 text-xs">
              <span className="text-muted-foreground">Booking: </span>
              <span className="font-medium">{customerLabel}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border p-2">
              <p className="text-muted-foreground">Dari</p>
              <p className="font-semibold">{fromValue}</p>
            </div>
            <div className="rounded-md border p-2 border-primary/40 bg-primary/5">
              <p className="text-muted-foreground">Menjadi</p>
              <p className="font-semibold text-primary">{toValue}</p>
            </div>
          </div>
          <div>
            <Label className="text-xs">Alasan koreksi (wajib, min. 10 karakter)</Label>
            <Textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: salah klik, pelanggan minta refund, dst."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Kirim Permintaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
