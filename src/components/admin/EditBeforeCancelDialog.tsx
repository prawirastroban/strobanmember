import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Pencil, XCircle, ArrowLeft } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingLabel: string;
  mode: "cancel" | "approve_cancel"; // approve_cancel = customer request
  onEdit: () => void;
  onCancelAnyway: () => void;
}

export default function EditBeforeCancelDialog({
  open, onOpenChange, bookingLabel, mode, onEdit, onCancelAnyway,
}: Props) {
  const title = mode === "approve_cancel"
    ? "Customer meminta pembatalan"
    : "Batalkan transaksi?";
  const body = mode === "approve_cancel"
    ? "Sebelum menyetujui pembatalan, apakah Anda ingin mengedit transaksi ini (mis. ubah tanggal, jam, cabang, atau kendaraan)? Ini mencegah customer input booking baru lagi dan mengurangi tumpukan data cancel."
    : "Untuk menghindari input ulang oleh customer yang sama, apakah Anda ingin mengedit transaksi ini (mis. ubah tanggal, jam, cabang, atau kendaraan) daripada membatalkannya?";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md p-0 overflow-hidden">
        <div className="p-6 pb-4">
          <AlertDialogHeader className="space-y-2 text-left">
            <AlertDialogTitle className="text-lg font-semibold">
              {title}
            </AlertDialogTitle>
            <div className="rounded-md bg-muted/60 px-3 py-2 text-sm font-medium text-foreground border border-border/60">
              {bookingLabel}
            </div>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground pt-1">
              {body}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter className="flex flex-col gap-2 p-4 pt-2 bg-muted/30 border-t sm:flex-col sm:space-x-0">
          <Button
            onClick={() => { onEdit(); onOpenChange(false); }}
            className="w-full gap-2 h-10"
          >
            <Pencil className="h-4 w-4" /> Edit Transaksi
          </Button>
          <Button
            variant="destructive"
            onClick={() => { onCancelAnyway(); onOpenChange(false); }}
            className="w-full gap-2 h-10"
          >
            <XCircle className="h-4 w-4" /> Tetap Batalkan
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full gap-2 h-9 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}