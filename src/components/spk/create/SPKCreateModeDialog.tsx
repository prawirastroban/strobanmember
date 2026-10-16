// Pembuatan SPK: pilih jenis (Service / Ban), lalu cara isi (Scan / Manual).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CircleDot, PenLine, ScanLine, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SPKScanDialog } from "./SPKScanDialog";
import type { SpkType } from "@/lib/spk/spkType";

const optionClass =
  "flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5";

export function SPKCreateModeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [scanOpen, setScanOpen] = useState(false);
  const [type, setType] = useState<SpkType | null>(null);

  useEffect(() => {
    if (open) setType(null);
  }, [open]);

  const pickScan = () => {
    onOpenChange(false);
    setScanOpen(true);
  };
  const pickManual = () => {
    onOpenChange(false);
    navigate(`/spk/new?type=${type ?? "service"}`);
  };

  const Option = ({
    icon: Icon,
    title,
    desc,
    onClick,
  }: {
    icon: typeof ScanLine;
    title: string;
    desc: string;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick} className={optionClass}>
      <span className="rounded-lg bg-primary/10 p-2 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {type ? `Buat SPK ${type === "ban" ? "Ban" : "Service"}` : "Buat SPK Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {type
                ? "Pilih cara pengisian. Keduanya menghasilkan SPK dengan alur yang sama."
                : "Pilih jenis SPK yang akan dibuat."}
            </DialogDescription>
          </DialogHeader>
          {!type ? (
            <div className="grid grid-cols-1 gap-3">
              <Option icon={Wrench} title="SPK Service" desc="Servis berkala, perbaikan, dan paket servis." onClick={() => setType("service")} />
              <Option icon={CircleDot} title="SPK Ban" desc="Ganti ban, balancing, spooring, dan tambal ban." onClick={() => setType("ban")} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <Option icon={ScanLine} title="📷 Scan SPK" desc="Foto formulir kertas, isian terbaca otomatis dan tetap bisa diedit." onClick={pickScan} />
              <Option icon={PenLine} title="✍️ Isi Manual" desc="Buka form intake SPK seperti biasa." onClick={pickManual} />
              <button
                type="button"
                onClick={() => setType(null)}
                className="inline-flex items-center gap-1 justify-self-start text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Ganti jenis SPK
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <SPKScanDialog open={scanOpen} onOpenChange={setScanOpen} spkType={type ?? "service"} />
    </>
  );
}
