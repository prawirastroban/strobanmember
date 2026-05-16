import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  bookingLabel: string;
  onDeleted: () => void;
}

export default function DeleteBookingDialog({
  open,
  onOpenChange,
  bookingId,
  bookingLabel,
  onDeleted,
}: Props) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (reason.trim().length < 5) {
      toast({
        variant: "destructive",
        title: "Alasan terlalu singkat",
        description: "Tulis alasan minimal 5 karakter.",
      });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-delete-booking",
      {
        body: { booking_id: bookingId, reason: reason.trim() },
      },
    );
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus",
        description: error?.message || (data as any)?.error,
      });
      return;
    }
    toast({ title: "Transaksi dihapus" });
    onDeleted();
    onOpenChange(false);
    setReason("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" /> Hapus Transaksi
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan permanen. <strong>{bookingLabel}</strong> beserta payment,
            invoice, dan log statusnya akan dihapus. Aksi ini dicatat di Audit
            Log.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs">
            Alasan penghapusan (min. 5 karakter)
          </Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Contoh: data duplikat / dibuat oleh customer salah / test"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={busy}
            className="bg-red-600 hover:bg-red-700 gap-2"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Hapus Permanen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
