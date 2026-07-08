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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{bookingLabel}</strong>
            <br />
            {body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
          <Button
            variant="destructive"
            onClick={() => { onCancelAnyway(); onOpenChange(false); }}
            className="gap-1.5"
          >
            <XCircle className="h-4 w-4" /> Tetap Batalkan
          </Button>
          <Button
            onClick={() => { onEdit(); onOpenChange(false); }}
            className="gap-1.5 bg-primary"
          >
            <Pencil className="h-4 w-4" /> Edit Transaksi
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}