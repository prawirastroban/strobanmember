// Pop-up preview untuk SPK (embed halaman /spk/:id/print via iframe).
// Optional `autoShare` mengirim query `?share=1` sehingga SPKPrint akan
// otomatis memicu Web Share API begitu siap.
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface SPKViewDialogProps {
  spkId: string | null;
  spkNumber?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autoShare?: boolean;
}

export function SPKViewDialog({
  spkId,
  spkNumber,
  open,
  onOpenChange,
  autoShare,
}: SPKViewDialogProps) {
  if (!spkId) return null;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [busy, setBusy] = useState<null | "share" | "download">(null);
  const src = `/spk/${spkId}/print?embed=1&bridge=1`;

  const post = (action: "share" | "download") => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    setBusy(action);
    // clear busy after a short window; SPKPrint will show its own toasts
    window.setTimeout(() => setBusy(null), 1200);
    try {
      w.postMessage({ type: "spk-print", action }, window.location.origin);
    } catch {
      toast.error("Aksi gagal");
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl p-0 gap-0 h-[90vh] flex flex-col overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between border-b bg-background/95 px-4 py-2.5 pr-12">
          <div className="min-w-0">
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
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => post("share")}
              disabled={busy !== null}
            >
              <Share2 className="h-3.5 w-3.5" />
              Bagikan
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => post("download")}
              disabled={busy !== null}
            >
              <Download className="h-3.5 w-3.5" />
              Unduh
            </Button>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          key={src}
          src={src}
          title={`SPK ${spkNumber ?? ""}`}
          className="flex-1 w-full border-0 bg-slate-100"
        />
      </DialogContent>
    </Dialog>
  );
}