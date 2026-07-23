// Panel share SPK — QR code + link publik + tombol salin + kirim WhatsApp.
// Mengikuti pola BookingShareCard (hasil Quick Booking) supaya konsisten.
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Copy, Link2, MessageCircle, QrCode } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";

interface SPKShareCardProps {
  spkId: string;
  spkNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  vehicleLabel?: string | null;
  plateNumber?: string | null;
  branch?: string | null;
  serviceDate?: string | null;
}

function normalizePhone62(raw?: string | null): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export function SPKShareCard({
  spkId,
  spkNumber,
  customerName,
  customerPhone,
  vehicleLabel,
  plateNumber,
  branch,
  serviceDate,
}: SPKShareCardProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://bengkelstroban.com";
    return `${origin}/spk/${spkId}/print`;
  }, [spkId]);

  const firstName = (customerName || "Pelanggan").split(" ")[0];
  const phone62 = normalizePhone62(customerPhone);
  const vehicleFull = [vehicleLabel, plateNumber].filter(Boolean).join(" • ");

  const waMessage = useMemo(() => {
    return [
      `Halo ${firstName}, berikut Surat Perintah Kerja (SPK) Anda di Bengkel Mobil Stroban Service.`,
      ``,
      `SPK       : ${spkNumber ?? "-"}`,
      `Kendaraan : ${vehicleFull || "-"}`,
      `Cabang    : ${branch ?? "-"}`,
      `Tanggal   : ${serviceDate ?? "-"}`,
      ``,
      `Lihat detail & unduh PDF:`,
      shareUrl,
      ``,
      `Butuh bantuan? Balas pesan ini. Terima kasih 🙏`,
    ].join("\n");
  }, [firstName, spkNumber, vehicleFull, branch, serviceDate, shareUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link disalin ke clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(waMessage);
      toast.success("Pesan WA disalin");
    } catch {
      toast.error("Gagal menyalin pesan");
    }
  };

  const handleShareWA = () => {
    if (!phone62) {
      toast.error("Nomor HP customer kosong");
      return;
    }
    openWhatsApp({ phone: phone62, text: waMessage });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <QrCode className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-base">Bagikan SPK</h3>
          <p className="text-xs text-muted-foreground">
            Scan QR atau salin link untuk membagikan SPK ke customer.
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="rounded-2xl bg-white p-3 shadow-sm border">
          <QRCodeSVG value={shareUrl} size={180} includeMargin={false} level="M" />
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">SPK</span>
            <span className="font-mono font-medium truncate">{spkNumber ?? "-"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-medium truncate">{customerName || "-"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Kendaraan</span>
            <span className="truncate">{vehicleFull || "-"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Cabang</span>
            <span className="truncate">{branch || "-"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Tanggal</span>
            <span>{serviceDate || "-"}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">Link Publik SPK</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">Bisa diakses tanpa login</Badge>
        </div>
        <div className="flex gap-2">
          <Input
            readOnly
            value={shareUrl}
            className="font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button type="button" variant="outline" size="icon" onClick={handleCopyLink} title="Salin link">
            {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          className="bg-[#25D366] hover:bg-[#1ebe57] text-white"
          onClick={handleShareWA}
          disabled={!phone62}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Kirim via WhatsApp
        </Button>
        <Button type="button" variant="outline" onClick={handleCopyMessage}>
          <Copy className="h-4 w-4 mr-2" />
          Salin Pesan
        </Button>
      </div>
      {!phone62 && (
        <p className="text-[11px] text-muted-foreground text-center">
          Nomor HP customer kosong — share manual via Salin Pesan.
        </p>
      )}
    </div>
  );
}

export default SPKShareCard;