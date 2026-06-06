import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUp, ArrowDown, Clock, RefreshCcw } from "lucide-react";
import { useCashbackBalance } from "@/hooks/useCashbackBalance";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const typeMeta: Record<string, { label: string; sign: string; cls: string; Icon: any }> = {
  credit: { label: "Cashback Masuk", sign: "+", cls: "text-emerald-600", Icon: ArrowDown },
  debit: { label: "Dipakai", sign: "−", cls: "text-rose-600", Icon: ArrowUp },
  refund: { label: "Pengembalian", sign: "+", cls: "text-emerald-600", Icon: RefreshCcw },
  expire: { label: "Kadaluarsa", sign: "−", cls: "text-muted-foreground", Icon: Clock },
  adjust: { label: "Penyesuaian", sign: "", cls: "text-foreground", Icon: Wallet },
};

const CashbackBalanceCard = () => {
  const { user } = useAuth();
  const { balance, expiringSoon, history, loading } = useCashbackBalance(user?.id);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="pt-5 pb-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Saldo Cashback
            </span>
          </div>
          <div className="text-3xl font-bold tabular-nums text-foreground">
            {loading ? "…" : formatIDR(balance)}
          </div>
          {expiringSoon > 0 && (
            <Badge
              variant="outline"
              className="text-[11px] border-amber-400 text-amber-700 dark:text-amber-300"
            >
              <Clock className="h-3 w-3 mr-1" />
              {formatIDR(expiringSoon)} akan kadaluarsa &lt; 14 hari
            </Badge>
          )}
          <p className="text-[11px] text-muted-foreground">
            Saldo otomatis ditambahkan setelah servis selesai dari promo bertipe
            cashback. Bisa dipakai sebagai potongan di transaksi berikutnya.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="text-sm font-semibold mb-3">Riwayat Saldo</h3>
          {loading ? (
            <p className="text-xs text-muted-foreground">Memuat…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Belum ada aktivitas. Klaim promo cashback untuk mulai mendapat saldo.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((row) => {
                const meta = typeMeta[row.type] || typeMeta.adjust;
                const Icon = meta.Icon;
                return (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="h-7 w-7 shrink-0 rounded-full bg-muted flex items-center justify-center">
                        <Icon className={`h-3.5 w-3.5 ${meta.cls}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium leading-snug truncate">
                          {row.description || meta.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(row.created_at), "d MMM yyyy HH:mm", {
                            locale: idLocale,
                          })}
                          {row.expires_at && row.type === "credit"
                            ? ` • Berlaku s/d ${format(
                                new Date(row.expires_at),
                                "d MMM yyyy",
                                { locale: idLocale },
                              )}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${meta.cls}`}>
                      {meta.sign}
                      {formatIDR(row.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CashbackBalanceCard;