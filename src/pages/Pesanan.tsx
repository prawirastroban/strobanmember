import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  BellRing, Car, CheckCircle2, ChevronRight, ClipboardList, Clock, FileText,
  History as HistoryIcon, Receipt, RefreshCw, Wrench, XCircle, MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface BookingItem {
  id: string;
  service_name: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  status: string;
  payment_status: string;
  car_type: string | null;
  car_plate_number: string | null;
  branch: string | null;
}

interface SpkMini {
  id: string;
  booking_id: string | null;
  spk_number: string | null;
  status: string;
  ai_health_report: { overall_status?: string; summary?: string } | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu konfirmasi",
  waiting_confirmation: "Menunggu konfirmasi",
  confirmed: "Dikonfirmasi",
  checked_in: "Mobil sudah tiba",
  in_progress: "Sedang dikerjakan",
  finishing: "Tahap akhir",
  ready: "Siap diambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STAGES = ["Konfirmasi", "Dikerjakan", "Siap", "Selesai"];
const stageOf = (s: string) =>
  s === "completed" ? 3 : s === "ready" ? 2 : ["checked_in", "in_progress", "finishing"].includes(s) ? 1 : 0;

const formatIDR = (n: number) => (!n || n <= 0 ? "Gratis" : `Rp ${Number(n).toLocaleString("id-ID")}`);
const formatDate = (d: string) => {
  try { return format(parseISO(d), "d MMM yyyy", { locale: idLocale }); } catch { return d; }
};

/** Kartu kaca (glisses) dengan specular highlight. */
const GlassCard = ({ className, children, tone = "default" }: { className?: string; children: React.ReactNode; tone?: "default" | "alert" }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-[20px] border bg-card/60 backdrop-blur-2xl",
      "shadow-[0_20px_50px_-20px_hsl(var(--foreground)/0.18),inset_0_1px_2px_hsl(var(--background)/0.6)]",
      tone === "alert" ? "border-primary/40" : "border-border/60",
      className,
    )}
  >
    <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background/40 via-transparent to-primary/5" />
    <div className="relative">{children}</div>
  </div>
);

const Pesanan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "riwayat" ? "riwayat" : "aktif";
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [spks, setSpks] = useState<SpkMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [plate, setPlate] = useState<string>("all");

  const load = useCallback(async () => {
    if (!user) return;
    setError(false);
    const [bRes, sRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("id,service_name,service_price,booking_date,booking_time,status,payment_status,car_type,car_plate_number,branch")
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false })
        .limit(200),
      supabase
        .from("spk_orders")
        .select("id,booking_id,spk_number,status,ai_health_report,created_at")
        .eq("customer_id", user.id)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (bRes.error) { setError(true); setLoading(false); return; }
    setBookings((bRes.data as BookingItem[]) || []);
    setSpks((sRes.data as unknown as SpkMini[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel("pesanan-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "spk_orders", filter: `customer_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const spkByBooking = useMemo(() => {
    const m = new Map<string, SpkMini>();
    spks.forEach((s) => { if (s.booking_id && !m.has(s.booking_id)) m.set(s.booking_id, s); });
    return m;
  }, [spks]);

  const plates = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.car_plate_number).filter(Boolean))) as string[],
    [bookings],
  );
  const byPlate = (b: BookingItem) => plate === "all" || b.car_plate_number === plate;
  const active = bookings.filter((b) => !["completed", "cancelled"].includes(b.status) && byPlate(b));
  const history = bookings.filter((b) => ["completed", "cancelled"].includes(b.status) && byPlate(b));
  const list = tab === "aktif" ? active : history;

  const setTab = (t: string) => setParams(t === "riwayat" ? { tab: "riwayat" } : {}, { replace: true });

  return (
    <div className="min-h-screen bg-background home-canvas app-glass-page">
      <Navbar redHeader />
      <section>
      <div className="home-red-bg relative -mt-px overflow-hidden rounded-b-[28px] px-4 pb-5 pt-2 text-primary-foreground">
        <div className="relative mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Pesanan</h1>
          <ClipboardList className="h-5 w-5 opacity-80" aria-hidden />
        </div>
      </div>
      </section>
      <main id="main" className="relative mx-auto mt-1 max-w-3xl bg-transparent pb-28">
        {/* Tabs garis bawah */}
        <div role="tablist" className="flex gap-6 border-b border-border/60 px-5 pt-3">
          {[
            { key: "aktif", label: "Pesanan Aktif", count: active.length },
            { key: "riwayat", label: "Riwayat", count: history.length },
          ].map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px min-h-11 border-b-2 px-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === t.key ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {!loading && t.count > 0 && <span className="ml-1.5 tabular-nums opacity-80">({t.count})</span>}
            </button>
          ))}
        </div>

        {/* Filter kendaraan */}
        <div className="px-4 pt-3">
        {plates.length > 1 && (
          <div className="relative -mx-4 mb-3 flex gap-2 overflow-x-auto bg-muted/40 px-4 py-2.5">
            {["all", ...plates].map((p) => (
              <button
                key={p}
                onClick={() => setPlate(p)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-4 text-xs font-medium transition-colors",
                  plate === p ? "border-primary bg-primary/10 text-primary" : "border-border bg-card/60 text-muted-foreground",
                )}
              >
                {p === "all" ? "Semua mobil" : p}
              </button>
            ))}
          </div>
        )}

        <div className="relative space-y-3">
          {loading ? (
            [0, 1].map((i) => <Skeleton key={i} className="h-28 w-full rounded-[20px]" />)
          ) : error ? (
            <GlassCard className="p-6 text-center">
              <p className="mb-3 text-sm text-muted-foreground">Gagal memuat pesanan. Periksa koneksi Anda.</p>
              <Button onClick={() => { setLoading(true); load(); }} className="min-h-11 gap-2">
                <RefreshCw className="h-4 w-4" /> Coba lagi
              </Button>
            </GlassCard>
          ) : list.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full glisses-tile text-primary">
                {tab === "aktif" ? <Car className="h-7 w-7" /> : <HistoryIcon className="h-7 w-7" />}
              </div>
              <p className="text-base font-semibold">Belum ada pesanan nih</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tab === "aktif" ? "Yuk booking servis di Bengkel Mobil Stroban" : "Servis selesai akan tampil di sini beserta SPK digital"}
              </p>
              <Button onClick={() => navigate("/booking")} className="mt-5 h-12 w-full rounded-2xl bg-gradient-to-b from-primary to-primary/80 text-sm font-semibold shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.7),inset_0_2px_4px_hsl(0_0%_100%/0.35)]">Pesan Servis</Button>
            </div>
          ) : (
            list.map((b) => (
              <OrderCard key={b.id} b={b} spk={spkByBooking.get(b.id) ?? null} history={tab === "riwayat"} />
            ))
          )}
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="min-h-11 gap-2 rounded-2xl">
            <Link to="/reminder-service"><BellRing className="h-4 w-4" /> Pengingat Servis</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11 gap-2 rounded-2xl">
            <Link to="/profile/history-perawatan"><HistoryIcon className="h-4 w-4" /> Kesehatan Mobil</Link>
          </Button>
        </div>
        </div>
      </main>
    </div>
  );
};

const OrderCard = ({ b, spk, history }: { b: BookingItem; spk: SpkMini | null; history: boolean }) => {
  const navigate = useNavigate();
  const needsApproval = spk?.status === "awaiting_customer_approval";
  const stage = stageOf(b.status);
  const cancelled = b.status === "cancelled";
  const detailPath = b.status === "completed" ? `/service/completed/${b.id}` : `/my-booking/${b.id}`;

  return (
    <GlassCard tone={needsApproval ? "alert" : "default"}>
      <button onClick={() => navigate(detailPath)} className="block w-full p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[28px]">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            cancelled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
            {cancelled ? <XCircle className="h-5 w-5" /> : b.status === "completed" ? <CheckCircle2 className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{b.service_name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {[b.car_type, b.car_plate_number].filter(Boolean).join(" · ") || "Kendaraan"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(b.booking_date)} · {b.booking_time?.slice(0, 5)}</span>
              {b.branch && <span className="inline-flex items-center gap-1 capitalize"><MapPin className="h-3 w-3" />{b.branch}</span>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums">{formatIDR(b.service_price)}</p>
            <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
              cancelled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
              {needsApproval ? "Butuh persetujuan" : STATUS_LABEL[b.status] || b.status}
            </span>
          </div>
        </div>

        {!history && !cancelled && (
          <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="Tahap servis">
            {STAGES.map((s, i) => (
              <li key={s} className="min-w-0">
                <div className={cn("h-1.5 rounded-full", i <= stage ? "bg-primary" : "bg-muted")} />
                <p className={cn("mt-1 truncate text-[11px]", i <= stage ? "font-medium text-foreground" : "text-muted-foreground")}>{s}</p>
              </li>
            ))}
          </ol>
        )}

        {spk?.ai_health_report?.summary && (
          <p className="mt-3 line-clamp-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Kondisi mobil: </span>{spk.ai_health_report.summary}
          </p>
        )}
      </button>

      {(spk || b.status === "completed") && (
        <div className="flex gap-2 border-t border-border/50 p-3">
          {spk && (
            <Button
              asChild
              size="sm"
              variant={needsApproval ? "default" : "secondary"}
              className="min-h-11 flex-1 gap-2 rounded-2xl"
            >
              <Link to={needsApproval ? `/spk/${spk.id}/approve` : `/spk/${spk.id}/print`}>
                <FileText className="h-4 w-4" />
                {needsApproval ? "Setujui SPK" : "Lihat SPK"}
              </Link>
            </Button>
          )}
          {b.status === "completed" && (
            <Button asChild size="sm" variant="outline" className="min-h-11 flex-1 gap-2 rounded-2xl">
              <Link to={`/invoice/${b.id}`}><Receipt className="h-4 w-4" /> Invoice</Link>
            </Button>
          )}
          <Button asChild size="icon" variant="ghost" className="h-11 w-11 shrink-0 rounded-2xl" aria-label="Lihat detail pesanan">
            <Link to={detailPath}><ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      )}
    </GlassCard>
  );
};

export default Pesanan;
