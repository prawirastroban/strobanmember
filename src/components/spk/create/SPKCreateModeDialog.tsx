// Pilihan mode pembuatan SPK: Scan SPK (OCR) atau Isi Manual.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine, ScanLine } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SPKScanDialog } from "./SPKScanDialog";

export function SPKCreateModeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [scanOpen, setScanOpen] = useState(false);

  const pickScan = () => {
    onOpenChange(false);
    setScanOpen(true);
  };
  const pickManual = () => {
    onOpenChange(false);
    navigate("/spk/new");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Buat SPK Baru</DialogTitle>
            <DialogDescription className="text-xs">
              Pilih cara pengisian. Keduanya menghasilkan SPK dengan alur yang sama.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={pickScan}
              className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5"
            >
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <ScanLine className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">📷 Scan SPK</span>
                <span className="block text-xs text-muted-foreground">
                  Foto formulir kertas, isian terbaca otomatis dan tetap bisa diedit.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={pickManual}
              className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5"
            >
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <PenLine className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">✍️ Isi Manual</span>
                <span className="block text-xs text-muted-foreground">
                  Buka form intake SPK seperti biasa.
                </span>
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <SPKScanDialog open={scanOpen} onOpenChange={setScanOpen} />
    </>
  );
}
