import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpdateErrorDialogProps {
  open: boolean;
  onRetry: () => void;
  onClose: () => void;
}

export const UpdateErrorDialog = ({ open, onRetry, onClose }: UpdateErrorDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "rgba(255,43,43,0.12)", color: "#ff2b2b" }}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base">Gagal memperbarui aplikasi.</DialogTitle>
              <DialogDescription>
                Tidak dapat menyelesaikan pembaruan. Sesi login Anda tetap aman.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button onClick={onRetry} style={{ background: "#ff2b2b", color: "white" }}>
            Coba Lagi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateErrorDialog;