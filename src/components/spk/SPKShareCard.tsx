// Panel share SPK — QR code + link publik + tombol salin + kirim WhatsApp.
// Mengikuti pola BookingShareCard (hasil Quick Booking) supaya konsisten.
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Copy, KeyRound, Link2, Loader2, MessageCircle, QrCode } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";
import { WEB_BASE_URL } from "@/lib/platform";
import { invokeAdminUserOps } from "@/lib/adminUserOps";
import { supabase } from "@/integrations/supabase/client";
import { ensureCustomerAccount } from "@/lib/spk/linkCustomerAccount";

// Host publik yang aman untuk share (tanpa wall login Lovable preview).
const PUBLIC_HOSTS = new Set([
  "bengkelstroban.com",
  "www.bengkelstroban.com",
  "strobanmember.lovable.app",
]);

function publicOrigin(): string {
  if (typeof window === "undefined") return WEB_BASE_URL;
  const host = window.location.hostname;
  if (PUBLIC_HOSTS.has(host)) return window.location.origin;
  return WEB_BASE_URL;
}

interface SPKShareCardProps {
  spkId: string;
  spkNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  vehicleLabel?: string | null;
  plateNumber?: string | null;
  branch?: string | null;
  serviceDate?: string | null;
  /** Auth user id of the customer (profiles.id) — enables the activation link. */
  customerId?: string | null;
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
  customerId,
}: SPKShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [claimCopied, setClaimCopied] = useState(false);
  const [issuing, setIssuing] = useState(false);
  // Akun bisa ditautkan menyusul dari kartu ini bila SPK dibuat tanpa akun.
  const [linkedCustomerId, setLinkedCustomerId] = useState<string | null>(customerId ?? null);
  const [linking, setLinking] = useState(false);
  const activeCustomerId = customerId ?? linkedCustomerId;

  const shareUrl = useMemo(() => {
    return `${publicOrigin()}/spk/${spkId}/track`;
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
      `Pantau progres SPK Anda secara live (tanpa login):`,
      shareUrl,
      ``,
      `Butuh bantuan? Balas pesan ini. Terima kasih 🙏`,
    ].join("\n");
  }, [firstName, spkNumber, vehicleFull, branch, serviceDate, shareUrl]);

  const claimMessage = useMemo(() => {
    if (!claimUrl) return "";
    return [
      `Halo ${firstName}, akun Anda di Bengkel Mobil Stroban Service sudah dibuat oleh admin.`,
      ``,
      `SPK       : ${spkNumber ?? "-"}`,
      `Kendaraan : ${vehicleFull || "-"}`,
      ``,
      `Aktifkan akun Anda (buat kata sandi) lewat link berikut — *berlaku 1x pakai*:`,
      claimUrl,
      ``,
      `Setelah aktif, Anda otomatis login dan bisa melihat seluruh riwayat servis.`,
      `Terima kasih 🙏`,
    ].join("\n");
  }, [claimUrl, firstName, spkNumber, vehicleFull]);

  const handleIssueClaim = async (force = false) => {
    const target = customerId ?? linkedCustomerId;
    if (!target) {
      toast.error("SPK ini belum terhubung ke akun customer");
      return;
    }
    setIssuing(true);
    try {
      const data = await invokeAdminUserOps<any>({
        action: "issue_claim_token",
        userId: target,
        force,
      });
      setClaimUrl(`${publicOrigin()}/claim/${data.claim_token}`);
      toast.success("Link aktivasi diterbitkan");
    } catch (error: any) {
      const msg = error?.message || "Gagal menerbitkan link aktivasi";
      if (msg.toLowerCase().includes("akun aktif")) {
        toast.info("Customer sudah punya akun aktif — cukup bagikan link tracking.");
      } else {
        toast.error(msg);
      }
    } finally {
      setIssuing(false);
    }
  };

  const handleCopyLink = async () => {
    return handleCopyLinkImpl();
  };

  /** Buat/pakai ulang akun pelanggan dari data SPK, lalu tautkan ke SPK. */
  const handleLinkAccount = async () => {
    if (!customerName || !customerPhone) {
      toast.error("Nama & nomor HP customer di SPK belum lengkap");
      return;
    }
    setLinking(true);
    try {
      const label = (vehicleLabel ?? "").trim();
      const [brand, ...rest] = label.split(/\s+/);
      const link = await ensureCustomerAccount({
        fullName: customerName,
        phone: customerPhone,
        vehicle:
          brand && plateNumber
            ? { brand, model: rest.join(" ") || brand, plate: plateNumber }
            : null,
      });
      if (!link.customerId) {
        toast.error(link.warning || "Gagal membuat akun customer");
        return;
      }
      const patch: Record<string, string> = { customer_id: link.customerId };
      if (link.vehicleId) patch.vehicle_id = link.vehicleId;
      const { error } = await supabase.from("spk_orders").update(patch).eq("id", spkId);
      if (error) throw error;
      setLinkedCustomerId(link.customerId);
      if (link.warning) toast.warning(link.warning);
      toast.success("SPK ditautkan ke akun customer");
      await handleIssueClaim(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menautkan akun");
    } finally {
      setLinking(false);
    }
  };

  const handleCopyLinkImpl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link disalin ke clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  const handleCopyClaim = async () => {
    if (!claimUrl) return;
    try {
      await navigator.clipboard.writeText(claimUrl);
      setClaimCopied(true);
      toast.success("Link aktivasi disalin");
      setTimeout(() => setClaimCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  const handleShareClaimWA = () => {
    if (!phone62) {
      toast.error("Nomor HP customer kosong");
      return;
    }
    openWhatsApp({ phone: phone62, text: claimMessage });
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
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <QrCode className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-base">Bagikan SPK</h3>
          <p className="text-xs text-muted-foreground break-words">
            Scan QR atau salin link — customer dapat memantau progres SPK secara live tanpa login.
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="rounded-2xl bg-white p-3 shadow-sm border max-w-full">
          <QRCodeSVG
            value={shareUrl}
            size={180}
            includeMargin={false}
            level="M"
            className="h-auto w-full max-w-[180px]"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
            <span className="text-muted-foreground shrink-0">SPK</span>
            <span className="min-w-0 font-mono font-medium break-all text-right">{spkNumber ?? "-"}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
            <span className="text-muted-foreground shrink-0">Customer</span>
            <span className="min-w-0 font-medium break-words text-right">{customerName || "-"}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
            <span className="text-muted-foreground shrink-0">Kendaraan</span>
            <span className="min-w-0 break-words text-right">{vehicleFull || "-"}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
            <span className="text-muted-foreground shrink-0">Cabang</span>
            <span className="min-w-0 break-words text-right">{branch || "-"}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
            <span className="text-muted-foreground shrink-0">Tanggal</span>
            <span className="min-w-0 break-words text-right">{serviceDate || "-"}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-xs font-semibold">Link Live Tracking SPK</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">Bisa diakses tanpa login</Badge>
        </div>
        <div className="flex gap-2">
          <Input
            readOnly
            value={shareUrl}
            className="min-w-0 flex-1 font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={handleCopyLink} title="Salin link">
            {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground break-words">
          Lembar SPK (PDF) bisa dibuka langsung dari halaman tracking ini.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          className="w-full bg-[#25D366] text-white hover:bg-[#1ebe57]"
          onClick={handleShareWA}
          disabled={!phone62}
        >
          <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">Kirim via WhatsApp</span>
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={handleCopyMessage}>
          <Copy className="mr-2 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">Salin Pesan</span>
        </Button>
      </div>
      {!phone62 && (
        <p className="text-center text-[11px] text-muted-foreground break-words">
          Nomor HP customer kosong — share manual via Salin Pesan.
        </p>
      )}

      <div className="space-y-2 rounded-xl border border-dashed p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-xs font-semibold">Aktivasi Akun Customer</span>
          </div>
          {claimUrl && <Badge className="text-[10px]">1x pakai</Badge>}
        </div>

        {!customerId ? (
          <p className="text-[11px] text-muted-foreground break-words">
            SPK ini belum terhubung ke akun customer, jadi link aktivasi belum bisa diterbitkan.
            Hubungkan/ buat akun customer terlebih dahulu.
          </p>
        ) : !claimUrl ? (
          <>
            <p className="text-[11px] text-muted-foreground break-words">
              Jika customer belum pernah login, terbitkan link aktivasi agar bisa membuat kata sandi
              dan mengakses riwayat servis.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleIssueClaim(false)}
              disabled={issuing}
            >
              {issuing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">Terbitkan Link Aktivasi Akun</span>
            </Button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                readOnly
                value={claimUrl}
                className="min-w-0 flex-1 font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={handleCopyClaim} title="Salin link aktivasi">
                {claimCopied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full bg-[#25D366] text-white hover:bg-[#1ebe57]"
              onClick={handleShareClaimWA}
              disabled={!phone62}
            >
              <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">Kirim Link Aktivasi via WhatsApp</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default SPKShareCard;