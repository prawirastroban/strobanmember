import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Wallet, ArrowLeft, ArrowDown, ArrowUp, Clock, RefreshCcw,
  AlertCircle, CheckCircle2, ExternalLink, Calendar, Car, Tag,
  ChevronRight, Info,
} from "lucide-react";
import { formatRupiah } from "@/lib/reportFormat";

interface LedgerRow {
  id: string;
  type: "credit" | "debit" | "refund" | "expire" | "adjust";
  amount: number;
  description: string | null;
  booking_id: string | null;
  promo_id: string | null;
  expires_at: string | null;
  created_at: string;
  booking?: {
    service_name: string | null;
    car_plate_number: string | null;
    status: string | null;
  } | null;
  promo?: {
    title: string | null;
  } | null;
}

interface BalanceRow {
  balance: number;
  expiring_soon: number;
}

const typeMeta: Record<string, { label: string; sign: string; cls: string; badge: string; Icon: any }> = {
  credit: { label: "Cashback Masuk", sign: "+", cls: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800", Icon: ArrowDown },
  debit: { label: "Dipakai", sign: "−", cls: "text-rose-600", badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800", Icon: ArrowUp },
  refund: { label: "Pengembalian", sign: "+", cls: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800", Icon: RefreshCcw },
  expire: { label: "Kadaluarsa", sign: "−", cls: "text-muted-foreground", badge: "bg-muted text-muted-foreground border-border", Icon: Clock },
  adjust: { label: "Penyesuaian", sign: "", cls: "text-foreground", badge: "bg-primary/10 text-primary border-primary/20", Icon: Wallet },
};

const formatDateTimeID = (d: string) =>
  format(new Date(d), "d MMM yyyy · HH:mm", { locale: idLocale });

const formatDateID = (d: string) =>
  format(new Date(d), "d MMM yyyy", { locale: idLocale });

const isExpired = (expiresAt: string | null) => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

const CashbackHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      const [ledgerRes, balRes] = await Promise.all([
        supabase
          .from("cashback_ledger")
          .select(
            `id, type, amount, description, booking_id, promo_id, expires_at, created_at,
            booking:bookings(service_name, car_plate_number, status),
            promo:promos(title)`
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("cashback_balances" as any)
          .select("balance, expiring_soon")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const rows = (ledgerRes.data || []).map((r: any) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        description: r.description,
        booking_id: r.booking_id,
        promo_id: r.promo_id,
        expires_at: r.expires_at,
        created_at: r.created_at,
        booking: Array.isArray(r.booking) ? r.booking[0] : r.booking,
        promo: Array.isArray(r.promo) ? r.promo[0] : r.promo,
      })) as LedgerRow[];

      setEntries(rows);
      const b = balRes.data as BalanceRow | null;
      setBalance(Number(b?.balance ?? 0));
      setExpiringSoon(Number(b?.expiring_soon ?? 0));
      setLoading(false);
    };

    fetchAll();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-4 md:py-6 max-w-3xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={() => navigate("/loyalty")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg md:text-xl font-bold leading-tight">Riwayat Saldo Cashback</h1>
            <p className="text-xs text-muted-foreground">
              Detail transaksi, sumber, dan masa berlaku saldo
            </p>
          </div>
        </div>

        {/* Balance summary */}
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-5 pb-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider">Saldo Cashback</span>
            </div>
            <div className="text-3xl font-bold tabular-nums text-foreground">
              {loading ? "…" : formatRupiah(balance)}
            </div>
            {expiringSoon > 0 && (
              <Badge
                variant="outline"
                className="text-[11px] border-amber-400 text-amber-700 dark:text-amber-300"
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                {formatRupiah(expiringSoon)} akan kadaluarsa dalam 14 hari
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Ledger list */}
        <div className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <p className="text-sm text-muted-foreground">Memuat riwayat…</p>
              </CardContent>
            </Card>
          ) : entries.length === 0 ? (
            <Card>
              <CardContent className="pt-8 pb-8 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Info className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Belum ada transaksi saldo cashback.
                </p>
                <p className="text-xs text-muted-foreground">
                  Klaim promo cashback dan selesaikan servis untuk mulai mengumpulkan saldo.
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate("/promo")}>
                  Lihat Promo
                </Button>
              </CardContent>
            </Card>
          ) : (
            entries.map((row) => {
              const meta = typeMeta[row.type] || typeMeta.adjust;
              const Icon = meta.Icon;
              const expired = row.type === "credit" && isExpired(row.expires_at);
              const active = row.type === "credit" && !expired && !entries.some(
                (e) => e.type === "expire" && e.booking_id === row.booking_id && e.amount === row.amount
              );

              return (
                <Card key={row.id} className="overflow-hidden">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-muted flex items-center justify-center mt-0.5">
                          <Icon className={`h-4 w-4 ${meta.cls}`} />
                        </div>
                        <div className="min-w-0 space-y-1">
                          {/* Top row: type badge + amount */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={`text-[11px] ${meta.badge}`}>
                              {meta.label}
                            </Badge>
                            {row.type === "credit" && (
                              expired ? (
                                <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-600 border-gray-200">
                                  Kadaluarsa
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3 mr-0.5" /> Aktif
                                </Badge>
                              )
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-sm font-medium leading-snug">
                            {row.description || meta.label}
                          </p>

                          {/* Source / Booking / Promo */}
                          <div className="space-y-1">
                            {row.booking && (
                              <button
                                onClick={() => row.booking_id && navigate(`/my-booking/${row.booking_id}`)}
                                className="flex items-center gap-1.5 text-xs text-primary hover:underline w-fit text-left"
                              >
                                <Car className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                  {row.booking.service_name || "Booking"}
                                  {row.booking.car_plate_number ? ` · ${row.booking.car_plate_number}` : ""}
                                </span>
                                <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                              </button>
                            )}
                            {row.promo?.title && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Tag className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{row.promo.title}</span>
                              </div>
                            )}
                            {row.booking?.status && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Info className="h-3.5 w-3.5 shrink-0" />
                                <span>Status booking: {row.booking.status}</span>
                              </div>
                            )}
                          </div>

                          {/* Dates */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateTimeID(row.created_at)}
                            </span>
                            {row.expires_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Berlaku s/d {formatDateID(row.expires_at)}
                                {expired && (
                                  <span className="text-rose-600 font-medium"> (Kadaluarsa)</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="shrink-0 text-right">
                        <span className={`text-base font-bold tabular-nums ${meta.cls}`}>
                          {meta.sign}
                          {formatRupiah(row.amount)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default CashbackHistory;
