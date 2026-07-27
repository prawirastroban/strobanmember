// Pop-up preview untuk SPK (embed halaman /spk/:id/print via iframe).
// Tombol Bagikan membuka panel SPKShareCard (QR + link publik + WhatsApp)
// mengikuti pola BookingShareCard dari hasil Quick Booking.
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SPKShareCard } from "./SPKShareCard";

interface SPKViewDialogProps {
  spkId: string | null;
  spkNumber?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialShareOpen?: boolean;
  customerName?: string | null;
  customerPhone?: string | null;
  vehicleLabel?: string | null;
  plateNumber?: string | null;
  branch?: string | null;
  serviceDate?: string | null;
  customerId?: string | null;
}

export function SPKViewDialog({
  spkId,
  spkNumber,
  open,
  onOpenChange,
  initialShareOpen,
  customerName,
  customerPhone,
  vehicleLabel,
  plateNumber,
  branch,
  serviceDate,
  customerId,
}: SPKViewDialogProps) {
  if (!spkId) return null;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [busy, setBusy] = useState<null | "download">(null);
  const [shareOpen, setShareOpen] = useState<boolean>(!!initialShareOpen);

  useEffect(() => {
    if (open) setShareOpen(!!initialShareOpen);
  }, [open, initialShareOpen]);

  const src = `/spk/${spkId}/print?embed=1&bridge=1`;

  const postDownload = () => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    setBusy("download");
    window.setTimeout(() => setBusy(null), 1200);
    try {
      w.postMessage({ type: "spk-print", action: "download" }, window.location.origin);
    } catch {
      toast.error("Unduh gagal");
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[92vh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-3rem)]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-3 py-2.5 pr-12 sm:px-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Preview SPK
            </p>
            <p className="truncate text-sm font-semibold">
              {spkNumber ?? "SPK"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={shareOpen ? "default" : "outline"}
              className="h-8 gap-1.5"
              onClick={() => setShareOpen((v) => !v)}
            >
              <Share2 className="h-3.5 w-3.5" />
              Bagikan
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={postDownload}
              disabled={busy !== null}
            >
              <Download className="h-3.5 w-3.5" />
              Unduh
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0 relative">
          <iframe
            ref={iframeRef}
            key={src}
            src={src}
            title={`SPK ${spkNumber ?? ""}`}
            className="absolute inset-0 h-full w-full border-0 bg-slate-100"
          />
          {shareOpen && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm overflow-y-auto">
              <div className="mx-auto max-w-md p-4 sm:p-6">
                <div className="rounded-2xl border bg-card shadow-xl p-4 sm:p-6">
                  <SPKShareCard
                    spkId={spkId}
                    spkNumber={spkNumber}
                    customerId={customerId}
                    customerName={customerName}
                    customerPhone={customerPhone}
                    vehicleLabel={vehicleLabel}
                    plateNumber={plateNumber}
                    branch={branch}
                    serviceDate={serviceDate}
                  />
                  <div className="pt-4 mt-4 border-t flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setShareOpen(false)}>
                      Tutup panel share
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}