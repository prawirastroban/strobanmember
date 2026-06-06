import { useMemo, useState } from "react";
import { Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useCashbackBalance } from "@/hooks/useCashbackBalance";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

interface Props {
  userId: string | undefined;
  /** Total tagihan setelah diskon lain, sebelum saldo cashback. */
  totalBeforeCashback: number;
  /** Jumlah saldo cashback yang user pilih untuk dipakai (controlled). */
  cashbackToUse: number;
  onChange: (amount: number) => void;
}

/**
 * Section "Pakai Saldo Cashback" di checkout. Tampil hanya jika saldo > 0.
 * Membatasi input maksimal = min(saldo, totalBeforeCashback).
 */
const CashbackUsageInput = ({ userId, totalBeforeCashback, cashbackToUse, onChange }: Props) => {
  const { balance, loading } = useCashbackBalance(userId);
  const [draft, setDraft] = useState<number>(0);

  const maxUsable = useMemo(
    () => Math.max(0, Math.min(balance, Math.floor(totalBeforeCashback))),
    [balance, totalBeforeCashback],
  );

  if (loading || balance <= 0) return null;

  const apply = () => {
    const v = Math.max(0, Math.min(draft || 0, maxUsable));
    onChange(v);
  };

  const useMax = () => {
    setDraft(maxUsable);
    onChange(maxUsable);
  };

  const clear = () => {
    setDraft(0);
    onChange(0);
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Saldo Cashback</p>
          </div>
          <Badge variant="secondary" className="font-mono">
            {formatIDR(balance)}
          </Badge>
        </div>

        {cashbackToUse > 0 ? (
          <div className="flex items-center justify-between rounded-lg bg-background border border-border px-3 py-2">
            <div>
              <p className="text-xs text-muted-foreground">Dipakai untuk transaksi ini</p>
              <p className="text-base font-bold text-primary tabular-nums">
                −{formatIDR(cashbackToUse)}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={clear}>
              <X className="h-4 w-4 mr-1" /> Hapus
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Pakai saldo cashback sebagai potongan. Maksimal {formatIDR(maxUsable)}.
            </p>
            <div className="flex gap-2">
              <CurrencyInput
                value={draft}
                onValueChange={(v) => setDraft(Math.min(v ?? 0, maxUsable))}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={useMax} disabled={maxUsable <= 0}>
                Pakai Maks
              </Button>
              <Button type="button" size="sm" onClick={apply} disabled={(draft || 0) <= 0}>
                Pakai
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CashbackUsageInput;