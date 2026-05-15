import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Receipt, Loader2, FileText, Eye, Download, Copy as CopyIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type ProofRow = {
  id: string;
  proof_url: string;
  method: string;
  sender_name: string;
  sender_bank: string | null;
  transfer_amount: number;
  transfer_date: string;
  status: string;
  notes: string | null;
  created_at: string;
};

const formatIDR = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;
const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

interface Props {
  bookingId: string;
  /** If provided, the button only renders for transfer/qris */
  paymentMethod?: string | null;
  size?: "sm" | "default";
  variant?: "ghost" | "outline" | "default";
  label?: string;
  className?: string;
}

const ALLOWED = new Set(["transfer", "qris"]);

const TransferProofButton = ({
  bookingId,
  paymentMethod,
  size = "sm",
  variant = "ghost",
  label = "Bukti",
  className,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState<ProofRow | null>(null);

  if (paymentMethod && !ALLOWED.has(paymentMethod.toLowerCase())) return null;

  const handleClick = async () => {
    setLoading(true);
    setProof(null);
    setOpen(true);
    const { data, error } = await supabase
      .from("manual_payment_proofs")
      .select("id,proof_url,method,sender_name,sender_bank,transfer_amount,transfer_date,status,notes,created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLoading(false);
    if (error) {
      toast.error("Gagal memuat bukti: " + error.message);
      setOpen(false);
      return;
    }
    if (!data) {
      toast.info("Belum ada bukti transfer untuk booking ini");
      setOpen(false);
      return;
    }
    setProof(data as ProofRow);
  };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={className ?? "h-7 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"}
        onClick={handleClick}
        title="Lihat bukti transfer"
      >
        <Receipt className="h-3.5 w-3.5" /> {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Bukti Pembayaran
            </DialogTitle>
            <DialogDescription>
              {proof ? `${proof.method.toUpperCase()} · ${proof.sender_name}` : "Memuat..."}
            </DialogDescription>
          </DialogHeader>

          {loading || !proof ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="capitalize">
                  {proof.method} · {proof.status}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(proof.created_at), "dd MMM yyyy HH:mm")}
                </p>
              </div>

              {isPdf(proof.proof_url) ? (
                <iframe src={proof.proof_url} title="Bukti PDF" className="w-full h-[60vh] rounded border border-border/60" />
              ) : (
                <img src={proof.proof_url} alt="Bukti" className="w-full max-h-[60vh] object-contain rounded border border-border/60" />
              )}

              <div className="grid grid-cols-2 gap-3 text-xs rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="col-span-2">
                  <p className="text-muted-foreground">Pengirim</p>
                  <p className="font-medium">{proof.sender_name}{proof.sender_bank ? ` · ${proof.sender_bank}` : ""}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nominal</p>
                  <p className="font-medium">{formatIDR(Number(proof.transfer_amount))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal Transfer</p>
                  <p className="font-medium">{format(new Date(proof.transfer_date), "dd MMM yyyy")}</p>
                </div>
                {proof.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Catatan</p>
                    <p className="font-medium whitespace-pre-wrap">{proof.notes}</p>
                  </div>
                )}
                <p className="col-span-2 font-mono text-[11px] break-all text-muted-foreground">{proof.proof_url}</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(proof.proof_url); toast.success("URL disalin"); }
                    catch { toast.error("Gagal menyalin"); }
                  }}
                >
                  <CopyIcon className="h-3.5 w-3.5" /> Salin URL
                </Button>
                <Button asChild variant="outline" size="sm" className="gap-1">
                  <a href={proof.proof_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </Button>
                <Button asChild size="sm" className="gap-1">
                  <a href={proof.proof_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3.5 w-3.5" /> Buka Tab Baru
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TransferProofButton;