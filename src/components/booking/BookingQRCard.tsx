import { QRCodeSVG } from "qrcode.react";
import { ScanLine, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  bookingId: string;
  amount?: number;
  paymentMethod?: string;
  compact?: boolean;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const methodLabel = (m?: string) => {
  switch (m) {
    case "pay_at_workshop": return "Bayar Tunai di Tempat";
    case "transfer": return "Bank Transfer";
    case "qris": return "QRIS";
    case "midtrans": return "Midtrans";
    default: return "Manual";
  }
};

const BookingQRCard = ({ bookingId, amount, paymentMethod, compact }: Props) => {
  const code = bookingId.slice(0, 8).toUpperCase();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Kode booking disalin");
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col items-center">
        <div className="inline-flex flex-col items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-center">
          <ScanLine className="h-4 w-4 text-primary" />
          <span className="max-w-[260px] text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-primary">
            KODE BOOKING BERHASIL DIBUAT, SILAHKAN TUNJUKAN KE KASIR
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="bg-white p-3 rounded-xl shadow-inner">
          <QRCodeSVG value={bookingId} size={compact ? 140 : 180} level="M" includeMargin={false} />
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 font-mono text-base font-semibold tracking-widest hover:text-primary transition"
          title="Salin kode"
        >
          {code}
          <Copy className="h-3.5 w-3.5 opacity-60" />
        </button>
        {amount !== undefined && (
          <div className="text-center space-y-0.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-lg font-semibold tabular-nums">{formatIDR(amount)}</p>
            {paymentMethod && (
              <p className="text-[11px] text-muted-foreground">via {methodLabel(paymentMethod)}</p>
            )}
          </div>
        )}
        <p className="text-[11.5px] text-muted-foreground text-center leading-relaxed max-w-[240px]">
          Tunjukkan layar ini ke kasir bengkel untuk konfirmasi kedatangan.
        </p>
      </div>
    </div>
  );
};

export default BookingQRCard;