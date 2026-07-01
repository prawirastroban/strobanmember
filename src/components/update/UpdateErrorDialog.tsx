import { AlertTriangle, PhoneCall } from "lucide-react";
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
  retryCount?: number;
  isForce?: boolean;
}

export const UpdateErrorDialog = ({
  open,
  onRetry,
  onClose,
  retryCount = 0,
  isForce = false,
}: UpdateErrorDialogProps) => {
  const showContactAdmin = retryCount >= 3;
  const contactHref = "https://wa.me/628973700800?text=Bantuan%20update%20aplikasi%20Stroban";
  return (
    <Dialog open={open} onOpenChange={(o) => (o || isForce ? null : onClose())}>
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
              <DialogTitle className="text-base">
                Terjadi kesalahan saat memperbarui aplikasi.
              </DialogTitle>
              <DialogDescription>
                Tidak dapat menyelesaikan pembaruan. Sesi login Anda tetap aman.
                {retryCount > 0 && ` (Percobaan ke-${retryCount})`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {showContactAdmin && (
            <Button variant="outline" asChild>
              <a href={contactHref} target="_blank" rel="noreferrer">
                <PhoneCall className="h-4 w-4 mr-2" />
                Hubungi Administrator
              </a>
            </Button>
          )}
          {!isForce && (
            <Button variant="outline" onClick={onClose}>Tutup</Button>
          )}
          <Button onClick={onRetry} style={{ background: "#ff2b2b", color: "white" }}>
            Coba Lagi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateErrorDialog;