import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy, Upload, Loader2, Banknote, QrCode } from "lucide-react";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch_label: string | null;
  branch: string | null;
  logo_url: string | null;
  notes: string | null;
}

interface QrisRow {
  id: string;
  label: string;
  merchant_name: string;
  qris_image_url: string;
  branch: string | null;
  notes: string | null;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

/**
 * Show branch-matched bank accounts (transfer) or QRIS image for the booking.
 * Falls back to entries with branch IS NULL (global).
 */
export function BranchPaymentInfo({
  bookingId,
  branch,
  method,
  amount,
}: {
  bookingId: string;
  branch: string | null;
  method: "transfer" | "qris";
  amount: number;
}) {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [qris, setQris] = useState<QrisRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (method === "transfer") {
        const { data } = await supabase
          .from("manual_payment_accounts")
          .select("*")
          .eq("is_active", true)
          .order("sort_order");
        const all = (data as BankAccount[]) || [];
        const branchMatch = branch ? all.filter((a) => a.branch === branch) : [];
        const globalMatch = all.filter((a) => !a.branch);
        const result = branchMatch.length > 0 ? branchMatch : globalMatch;
        if (!cancelled) setAccounts(result);
      } else {
        const { data } = await supabase
          .from("manual_payment_qris")
          .select("*")
          .eq("is_active", true)
          .order("sort_order");
        const all = (data as QrisRow[]) || [];
        const branchMatch = branch ? all.find((q) => q.branch === branch) : null;
        if (!cancelled) setQris(branchMatch || null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, branch, method]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} disalin`);
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (method === "transfer") {
    if (accounts.length === 0) {
      return (
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2">
          <p className="text-[13px] font-semibold flex items-center gap-1.5">
            <Banknote className="h-4 w-4 text-primary" /> Transfer Bank
          </p>
          <p className="text-[11.5px] text-muted-foreground leading-relaxed">
            Rekening untuk cabang ini belum diatur. Silakan hubungi admin atau lanjut ke halaman upload bukti.
          </p>
          <Button asChild size="sm" className="w-full gap-1.5 h-9 rounded-full mt-1">
            <Link to={`/payment/manual/${bookingId}`}>
              <Upload className="h-4 w-4" /> Lanjut Upload Bukti
            </Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold flex items-center gap-1.5">
            <Banknote className="h-4 w-4 text-primary" /> Transfer Bank
          </p>
          <button
            type="button"
            onClick={() => copy(String(amount), "Nominal")}
            className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
          >
            <Copy className="h-3 w-3" /> {formatIDR(amount)}
          </button>
        </div>

        <div className="space-y-2">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-xl border border-border/50 bg-card/80 p-3 flex items-center gap-3"
            >
              {acc.logo_url ? (
                <img src={acc.logo_url} alt="" className="h-10 w-10 object-contain rounded-md shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                  {acc.bank_name.slice(0, 3).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold leading-tight truncate">
                  {acc.bank_name}
                  {acc.branch_label && (
                    <span className="text-muted-foreground font-normal"> · {acc.branch_label}</span>
                  )}
                </p>
                <p className="font-mono text-[13px] font-semibold tracking-wide leading-tight mt-0.5">
                  {acc.account_number}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">a.n {acc.account_holder}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 gap-1 rounded-full"
                onClick={() => copy(acc.account_number, "Nomor rekening")}
              >
                <Copy className="h-3.5 w-3.5" /> Salin
              </Button>
            </div>
          ))}
        </div>

        <Button asChild size="sm" className="w-full gap-1.5 h-9 rounded-full">
          <Link to={`/payment/manual/${bookingId}`}>
            <Upload className="h-4 w-4" /> Upload Bukti Transfer
          </Link>
        </Button>
      </div>
    );
  }

  // QRIS
  if (!qris) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2">
        <p className="text-[13px] font-semibold flex items-center gap-1.5">
          <QrCode className="h-4 w-4 text-primary" /> QRIS
        </p>
        <p className="text-[11.5px] text-muted-foreground leading-relaxed">
          QRIS untuk cabang ini belum diatur. Silakan hubungi admin atau lanjut ke halaman upload bukti.
        </p>
        <Button asChild size="sm" className="w-full gap-1.5 h-9 rounded-full mt-1">
          <Link to={`/payment/manual/${bookingId}`}>
            <Upload className="h-4 w-4" /> Lanjut Upload Bukti
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold flex items-center gap-1.5">
          <QrCode className="h-4 w-4 text-primary" /> QRIS
        </p>
        <button
          type="button"
          onClick={() => copy(String(amount), "Nominal")}
          className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
        >
          <Copy className="h-3 w-3" /> {formatIDR(amount)}
        </button>
      </div>
      <div className="rounded-xl border border-border/50 bg-card/80 p-3 flex flex-col items-center gap-2">
        <img
          src={qris.qris_image_url}
          alt={qris.label}
          className="h-56 w-56 max-w-full object-contain bg-white rounded-md"
        />
        <p className="text-[12.5px] font-semibold text-center">{qris.merchant_name}</p>
        {qris.notes && (
          <p className="text-[11px] text-muted-foreground text-center leading-snug">{qris.notes}</p>
        )}
      </div>
      <Button asChild size="sm" className="w-full gap-1.5 h-9 rounded-full">
        <Link to={`/payment/manual/${bookingId}`}>
          <Upload className="h-4 w-4" /> Upload Bukti QRIS
        </Link>
      </Button>
    </div>
  );
}

export default BranchPaymentInfo;