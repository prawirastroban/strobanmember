import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2, Copy, MessageCircle, Link2, Plus, X, AlertTriangle,
} from "lucide-react";

interface BookingShareCardProps {
  bookingId: string;
  token: string | null;
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  date: string;
  time: string;
  branch: string;
  vehicleLabel: string;
  onClose: () => void;
  onCreateAnother?: () => void;
}

function normalizePhone62(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export function BookingShareCard({
  bookingId, token, customerName, customerPhone,
  serviceName, date, time, branch, vehicleLabel,
  onClose, onCreateAnother,
}: BookingShareCardProps) {
  const [copied, setCopied] = useState(false);

  const trackUrl = useMemo(() => {
    if (token) return `https://bengkelstroban.com/t/${token}`;
    if (typeof window !== "undefined") return `${window.location.origin}/t/${bookingId}`;
    return "";
  }, [token, bookingId]);

  const firstName = (customerName || "Pelanggan").split(" ")[0];
  const phone62 = normalizePhone62(customerPhone);

  const waMessage = useMemo(() => {
    return [
      `Halo ${firstName}, booking servis Anda di Sahabat Stroban Service sudah dibuat.`,
      ``,
      `Servis    : ${serviceName}`,
      `Tanggal   : ${date} ${time}`,
      `Cabang    : ${branch}`,
      `Kendaraan : ${vehicleLabel}`,
      ``,
      `Lacak status real-time (link pribadi — jangan dibagikan):`,
      trackUrl,
      ``,
      `Butuh bantuan? Balas pesan ini. Terima kasih 🙏`,
    ].join("\n");
  }, [firstName, serviceName, date, time, branch, vehicleLabel, trackUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackUrl);
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
    const url = `https://wa.me/${phone62}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center gap-2 py-2">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-base">Booking Berhasil Dibuat</h3>
          <p className="text-xs text-muted-foreground">
            Bagikan link tracking ke customer agar bisa pantau status servis.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium truncate ml-2">{customerName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Servis</span><span className="font-medium truncate ml-2">{serviceName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Jadwal</span><span>{date} • {time}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Cabang</span><span className="truncate ml-2">{branch}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Kendaraan</span><span className="font-mono text-xs truncate ml-2">{vehicleLabel}</span></div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">Link Tracking</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">Link pribadi customer</Badge>
        </div>
        <div className="flex gap-2">
          <Input readOnly value={trackUrl} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button type="button" variant="outline" size="icon" onClick={handleCopy} title="Salin link">
            {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        {!token && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Token belum tersedia — pakai link cadangan. Refresh halaman jika error.
          </p>
        )}
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

      <div className="flex justify-between gap-2 pt-2 border-t">
        {onCreateAnother && (
          <Button type="button" variant="ghost" onClick={onCreateAnother}>
            <Plus className="h-4 w-4 mr-1" /> Booking Baru
          </Button>
        )}
        <Button type="button" className="ml-auto" onClick={onClose}>
          <X className="h-4 w-4 mr-1" /> Selesai
        </Button>
      </div>
    </div>
  );
}

export default BookingShareCard;