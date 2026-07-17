// Pop-up preview untuk SPK (embed halaman /spk/:id/print via iframe).
// Optional `autoShare` mengirim query `?share=1` sehingga SPKPrint akan
// otomatis memicu Web Share API begitu siap.
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  const qs = new URLSearchParams({ embed: "1" });
  if (autoShare) qs.set("share", "1");
  const src = `/spk/${spkId}/print?${qs.toString()}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl p-0 gap-0 h-[90vh] flex flex-col overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between border-b bg-background/95 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Preview SPK
            </p>
            <p className="truncate text-sm font-semibold">
              {spkNumber ?? "SPK"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-2 -mr-2 rounded-full hover:bg-muted"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <iframe
          key={src}
          src={src}
          title={`SPK ${spkNumber ?? ""}`}
          className="flex-1 w-full border-0 bg-slate-100"
        />
      </DialogContent>
    </Dialog>
  );
}