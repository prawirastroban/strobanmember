import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Loader2, User, Calendar, Clock, CheckCircle2, XCircle, ArrowRight,
  Search, Wallet, Wrench, TrendingUp, ChevronRight, Hourglass, PlayCircle,
} from "lucide-react";

interface BookingRow {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string | null;
  service_name: string;
  service_price: number;
  branch: string | null;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

interface StatusLog {
  id: string;
  booking_id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  duration_from_prev_minutes: number | null;
}

const fmtRp = (n: number) =>
  "Rp " + (n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const fmtMinutes = (m: number | null) => {
  if (m == null) return "—";
  if (m < 1) return "<1 mnt";
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} jam` : `${h}j ${rest}m`;
};

const durationTone = (m: number | null) => {
  if (m == null) return "bg-muted text-muted-foreground";
  if (m < 15) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (m <= 60) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-destructive/15 text-destructive";
};

const statusLabel = (s: string | null) => {
  if (!s) return "Awal";
  const map: Record<string, string> = {
    idle: "Menunggu",
    pending: "Menunggu",
    waiting_confirmation: "Menunggu Konfirmasi",
    confirmed: "Dikonfirmasi",
    checked_in: "Check-in",
    in_progress: "Dikerjakan",
    completed: "Selesai",
    cancelled: "Dibatalkan",
  };
  return map[s] || s.replace(/_/g, " ");
};

const statusTone = (s: string) => {
  switch (s) {
    case "completed": return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "cancelled": return "bg-destructive/15 text-destructive border-destructive/30";
    case "in_progress":
    case "checked_in": return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
    case "confirmed": return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

interface CustomerSummary {
  user_id: string;
  name: string;
  phone: string | null;
  totalBookings: number;
  completed: number;
  totalSpent: number;
  lastBookingAt: string;
  bookings: BookingRow[];
}

export default function CustomerActivitySummary() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerSummary | null>(null);
  const [logsByBooking, setLogsByBooking] = useState<Record<string, StatusLog[]>>({});
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("id,user_id,customer_name,customer_phone,service_name,service_price,branch,status,payment_status,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    setBookings((data as BookingRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const customers: CustomerSummary[] = useMemo(() => {
    const map = new Map<string, CustomerSummary>();
    bookings.forEach((b) => {
      if (!b.user_id) return;
      const existing = map.get(b.user_id);
      if (!existing) {
        map.set(b.user_id, {
          user_id: b.user_id,
          name: b.customer_name,
          phone: b.customer_phone,
          totalBookings: 1,
          completed: b.status === "completed" ? 1 : 0,
          totalSpent: (b.status === "completed" || b.payment_status === "paid")
            ? Number(b.service_price || 0) : 0,
          lastBookingAt: b.created_at,
          bookings: [b],
        });
      } else {
        existing.totalBookings += 1;
        if (b.status === "completed") existing.completed += 1;
        if (b.status === "completed" || b.payment_status === "paid") {
          existing.totalSpent += Number(b.service_price || 0);
        }
        if (b.created_at > existing.lastBookingAt) existing.lastBookingAt = b.created_at;
        existing.bookings.push(b);
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastBookingAt).getTime() - new Date(a.lastBookingAt).getTime()
    );
  }, [bookings]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const openCustomer = async (c: CustomerSummary) => {
    setSelected(c);
    setLogsLoading(true);
    const ids = c.bookings.map((b) => b.id);
    const { data } = await (supabase as any)
      .from("booking_status_logs")
      .select("*")
      .in("booking_id", ids)
      .order("changed_at", { ascending: true });
    const grouped: Record<string, StatusLog[]> = {};
    ((data as StatusLog[]) || []).forEach((l) => {
      if (!grouped[l.booking_id]) grouped[l.booking_id] = [];
      grouped[l.booking_id].push(l);
    });
    setLogsByBooking(grouped);
    setLogsLoading(false);
  };

  const initials = (name?: string | null) => {
    if (!name) return "?";
    return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Aktivitas Pelanggan</CardTitle>
              <p className="text-xs text-muted-foreground">
                {customers.length} pelanggan dengan transaksi — klik untuk lihat detail timeline
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / no. HP"
                className="pl-7 h-8 text-xs w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              {search ? "Tidak ada pelanggan cocok" : "Belum ada pelanggan dengan transaksi"}
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((c) => {
                const completionRate = c.totalBookings
                  ? Math.round((c.completed / c.totalBookings) * 100)
                  : 0;
                return (
                  <li key={c.user_id}>
                    <button
                      onClick={() => openCustomer(c)}
                      className="w-full flex items-center gap-3 py-2.5 px-1 text-left hover:bg-muted/40 rounded-md transition-colors"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {initials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name || "Tanpa Nama"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {c.totalBookings} booking · {c.completed} selesai · {fmtRp(c.totalSpent)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className="text-[10px]">
                          {completionRate}%
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {fmtDate(c.lastBookingAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                {initials(selected?.name)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <DialogTitle className="text-base">{selected?.name}</DialogTitle>
                <DialogDescription className="text-xs">
                  {selected?.phone || "—"} · {selected?.totalBookings} booking · {fmtRp(selected?.totalSpent || 0)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="p-4 space-y-4">
              {/* Quick stats */}
              {selected && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border bg-card p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground">
                      <Wrench className="h-3 w-3" /> Total
                    </div>
                    <p className="text-lg font-bold mt-0.5">{selected.totalBookings}</p>
                  </div>
                  <div className="rounded-lg border bg-card p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3" /> Selesai
                    </div>
                    <p className="text-lg font-bold mt-0.5 text-emerald-600">{selected.completed}</p>
                  </div>
                  <div className="rounded-lg border bg-card p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground">
                      <Wallet className="h-3 w-3" /> Belanja
                    </div>
                    <p className="text-sm font-bold mt-0.5">{fmtRp(selected.totalSpent)}</p>
                  </div>
                </div>
              )}

              {logsLoading ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                    Riwayat Booking & Timeline
                  </h4>
                  {selected?.bookings
                    .slice()
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((b) => {
                      const logs = logsByBooking[b.id] || [];
                      // Total durasi: dari booking dibuat sampai status terakhir
                      const firstAt = new Date(b.created_at).getTime();
                      const lastAt = logs.length
                        ? new Date(logs[logs.length - 1].changed_at).getTime()
                        : new Date(b.updated_at).getTime();
                      const totalMin = Math.round((lastAt - firstAt) / 60000);
                      return (
                        <div key={b.id} className="rounded-lg border bg-card overflow-hidden">
                          <div className="p-3 border-b bg-muted/30">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{b.service_name}</p>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Calendar className="h-3 w-3" />
                                  {fmtDate(b.created_at)}
                                  {b.branch && <span>· {b.branch}</span>}
                                </p>
                              </div>
                              <Badge variant="outline" className={`${statusTone(b.status)} text-[10px] shrink-0`}>
                                {statusLabel(b.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-[11px]">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Wallet className="h-3 w-3" /> {fmtRp(Number(b.service_price || 0))}
                              </span>
                              {logs.length > 0 && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <TrendingUp className="h-3 w-3" /> Total proses: {fmtMinutes(totalMin)}
                                </span>
                              )}
                            </div>
                          </div>

                          {logs.length === 0 ? (
                            <div className="p-3 text-center text-xs text-muted-foreground">
                              {b.status === "cancelled" ? (
                                <span className="inline-flex items-center gap-1">
                                  <XCircle className="h-3 w-3" /> Booking dibatalkan, tidak ada timeline
                                </span>
                              ) : (
                                "Belum ada perubahan status tercatat"
                              )}
                            </div>
                          ) : (
                            <ol className="p-3 space-y-2">
                              {logs.map((l, idx) => (
                                <li key={l.id} className="flex items-start gap-3">
                                  <div className="flex flex-col items-center shrink-0">
                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                      l.to_status === "completed"
                                        ? "bg-emerald-500/20 text-emerald-600"
                                        : l.to_status === "cancelled"
                                        ? "bg-destructive/20 text-destructive"
                                        : "bg-primary/15 text-primary"
                                    }`}>
                                      {idx + 1}
                                    </div>
                                    {idx < logs.length - 1 && (
                                      <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 12 }} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 pb-1">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-1.5 text-xs">
                                        <span className="text-muted-foreground">{statusLabel(l.from_status)}</span>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-medium">{statusLabel(l.to_status)}</span>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={`${durationTone(l.duration_from_prev_minutes)} border-0 text-[10px]`}
                                      >
                                        <Clock className="h-2.5 w-2.5 mr-1" />
                                        {fmtMinutes(l.duration_from_prev_minutes)}
                                      </Badge>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {fmtDate(l.changed_at)}
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}