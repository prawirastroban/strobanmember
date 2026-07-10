// Phase 5.2 — SPK Work Queue UI (Design Only)
// Mobile-first operational surface for Service Advisor / Foreman / Mechanic.
// Live-bound to spk_orders + related profiles/vehicles (presentation only).
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  ArrowLeft,
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User2,
  Car,
  Hash,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirrors SpkOrderRow shape loosely for design-only)

interface SpkCard {
  id: string;
  spk_number: string;
  customer_name: string;
  vehicle_desc: string;
  plate_number: string;
  status: "in_progress" | "pending" | "waiting_approval" | "completed_today";
  progress_pct: number;
  entry_time: string; // HH:mm
  priority: "normal" | "high";
  phone?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Live data mapping helpers

function mapDbStatus(
  dbStatus: string,
  createdAt: string,
): SpkCard["status"] | null {
  switch (dbStatus) {
    case "in_progress":
      return "in_progress";
    case "draft":
    case "pending":
      return "pending";
    case "waiting_approval":
      return "waiting_approval";
    case "closed": {
      const d = new Date(createdAt);
      const today = new Date();
      const sameDay =
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();
      return sameDay ? "completed_today" : null;
    }
    default:
      return null; // cancelled and unknown are hidden
  }
}

const PROGRESS_BY_STATUS: Record<SpkCard["status"], number> = {
  pending: 0,
  in_progress: 50,
  waiting_approval: 85,
  completed_today: 100,
};

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--";
  }
}

type Snapshot = Record<string, unknown>;

function asSnapshot(value: unknown): Snapshot {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Snapshot)
    : {};
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Status helpers

const STATUS_META: Record<
  SpkCard["status"],
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  in_progress: {
    label: "Sedang Dikerjakan",
    badgeClass: "bg-primary/15 text-primary border-primary/30",
    icon: Clock,
  },
  pending: {
    label: "Menunggu",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: Clock,
  },
  waiting_approval: {
    label: "Menunggu Approval",
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    icon: AlertTriangle,
  },
  completed_today: {
    label: "Selesai Hari Ini",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2,
  },
};

const STATUS_ORDER: SpkCard["status"][] = [
  "in_progress",
  "pending",
  "waiting_approval",
  "completed_today",
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components

function StatusBadge({ status }: { status: SpkCard["status"] }) {
  const meta = STATUS_META[status];
  return (
    <Badge
      className={cn(
        "whitespace-nowrap border text-[10px] font-semibold",
        meta.badgeClass,
      )}
    >
      {meta.label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: SpkCard["priority"] }) {
  if (priority === "normal") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive border border-destructive/30">
      <AlertTriangle className="h-3 w-3" />
      PRIORITAS
    </span>
  );
}

function SpkCardItem({ spk, onClick }: { spk: SpkCard; onClick: () => void }) {
  const meta = STATUS_META[spk.status];
  const StatusIcon = meta.icon;

  return (
    <Card
      className={cn(
        "interactive-card cursor-pointer overflow-hidden",
        "transition-all duration-200",
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Top row: SPK number + Status badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {spk.spk_number}
            </p>
          </div>
          <StatusBadge status={spk.status} />
        </div>

        {/* Middle: Customer + Vehicle info */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <User2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-sm text-foreground truncate">
              {spk.customer_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate">
              {spk.vehicle_desc}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-sm font-mono text-muted-foreground">
              {spk.plate_number}
            </span>
          </div>
        </div>

        <Separator className="mb-3" />

        {/* Bottom: Progress + Time + Priority */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {spk.status !== "completed_today" && (
              <div className="flex items-center gap-2 mb-1">
                <Progress value={spk.progress_pct} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {spk.progress_pct}%
                </span>
              </div>
            )}
            {spk.status === "completed_today" && (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Selesai</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <StatusIcon className="h-3 w-3" />
              <span className="tabular-nums">{spk.entry_time}</span>
            </div>
            <PriorityBadge priority={spk.priority} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <ClipboardList className="h-8 w-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">Tidak ada SPK {label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page

export default function SPKWorkQueue() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SpkCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  // Support legacy /spk?action=new deep-link → redirect to dedicated intake form.
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
      navigate("/spk/new");
    }
  }, [searchParams, setSearchParams, navigate]);

  // Fetch live SPKs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: orders } = await supabase
        .from("spk_orders")
        .select(
          "id, spk_number, status, priority, created_at, customer_id, vehicle_id, booking_id, data",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100);

      const list = (orders ?? []) as Array<{
        id: string;
        spk_number: string;
        status: string;
        priority: string;
        created_at: string;
        customer_id: string | null;
        vehicle_id: string | null;
        booking_id: string | null;
        data: unknown;
      }>;

      const customerIds = Array.from(
        new Set(list.map((r) => r.customer_id).filter(Boolean) as string[]),
      );
      const vehicleIds = Array.from(
        new Set(list.map((r) => r.vehicle_id).filter(Boolean) as string[]),
      );
      const bookingIds = Array.from(
        new Set(list.map((r) => r.booking_id).filter(Boolean) as string[]),
      );

      const [profilesRes, vehiclesRes, bookingsRes] = await Promise.all([
        customerIds.length
          ? supabase
              .from("profiles")
              .select("id, full_name, phone")
              .in("id", customerIds)
          : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; phone: string | null }> }),
        vehicleIds.length
          ? supabase
              .from("vehicles")
              .select("id, brand, model, year, license_plate")
              .in("id", vehicleIds)
          : Promise.resolve({ data: [] as Array<{ id: string; brand: string | null; model: string | null; year: number | null; license_plate: string | null }> }),
        bookingIds.length
          ? supabase
              .from("bookings")
              .select("id, customer_name, customer_phone, car_type, car_plate_number, service_name")
              .in("id", bookingIds)
          : Promise.resolve({ data: [] as Array<{ id: string; customer_name: string | null; customer_phone: string | null; car_type: string | null; car_plate_number: string | null; service_name: string | null }> }),
      ]);

      const profileMap = new Map(
        ((profilesRes.data ?? []) as Array<{ id: string; full_name: string | null; phone: string | null }>).map((p) => [p.id, p]),
      );
      const vehicleMap = new Map(
        ((vehiclesRes.data ?? []) as Array<{ id: string; brand: string | null; model: string | null; year: number | null; license_plate: string | null }>).map((v) => [v.id, v]),
      );
      const bookingMap = new Map(
        ((bookingsRes.data ?? []) as Array<{ id: string; customer_name: string | null; customer_phone: string | null; car_type: string | null; car_plate_number: string | null; service_name: string | null }>).map((b) => [b.id, b]),
      );

      const mapped: SpkCard[] = [];
      for (const r of list) {
        const uiStatus = mapDbStatus(r.status, r.created_at);
        if (!uiStatus) continue;
        const prof = r.customer_id ? profileMap.get(r.customer_id) : null;
        const veh = r.vehicle_id ? vehicleMap.get(r.vehicle_id) : null;
        const booking = r.booking_id ? bookingMap.get(r.booking_id) : null;
        const snap = asSnapshot(r.data);
        const vehicleDesc = veh
          ? [veh.brand, veh.model, veh.year].filter(Boolean).join(" ")
          : [snap.vehicle_merk, snap.vehicle_tipe, snap.vehicle_tahun]
              .map(textValue)
              .filter(Boolean)
              .join(" ") ||
            booking?.car_type ||
            "Kendaraan —";
        mapped.push({
          id: r.id,
          spk_number: r.spk_number,
          customer_name:
            prof?.full_name?.trim() ||
            textValue(snap.customer_name) ||
            booking?.customer_name ||
            "Pelanggan —",
          vehicle_desc: vehicleDesc || "Kendaraan —",
          plate_number: veh?.license_plate || textValue(snap.vehicle_plate) || booking?.car_plate_number || "—",
          status: uiStatus,
          progress_pct: PROGRESS_BY_STATUS[uiStatus],
          entry_time: fmtTime(r.created_at),
          priority: r.priority === "high" || r.priority === "urgent" ? "high" : "normal",
          phone: prof?.phone ?? textValue(snap.customer_phone) || booking?.customer_phone || undefined,
        });
      }

      if (!cancelled) {
        setRows(mapped);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  // Realtime + focus refresh
  useEffect(() => {
    const channel = supabase
      .channel("spk-work-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spk_orders" },
        () => setReloadTick((t) => t + 1),
      )
      .subscribe();
    const onFocus = () => setReloadTick((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.spk_number.toLowerCase().includes(q) ||
        s.customer_name.toLowerCase().includes(q) ||
        s.plate_number.toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q),
    );
  }, [query, rows]);

  const grouped = useMemo(() => {
    const map = new Map<SpkCard["status"], SpkCard[]>();
    for (const s of filtered) {
      const arr = map.get(s.status) ?? [];
      arr.push(s);
      map.set(s.status, arr);
    }
    // Sort within each group: high priority first, then earlier entry time
    for (const [, arr] of map) {
      arr.sort((a, b) => {
        if (a.priority === "high" && b.priority !== "high") return -1;
        if (a.priority !== "high" && b.priority === "high") return 1;
        return a.entry_time.localeCompare(b.entry_time);
      });
    }
    return map;
  }, [filtered]);

  const handleNewSPK = () => {
    navigate("/spk/new");
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Sticky search header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition"
                aria-label="Kembali"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Antrian SPK
              </h1>
            </div>
            <Badge variant="secondary" className="text-xs">
              {filtered.length} SPK
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Cari nomor SPK, nama, plat, atau HP…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 bg-card border-border/70 text-sm"
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-4 pt-4 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mb-2" />
            <p className="text-sm">Memuat antrian SPK…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Belum ada SPK — tekan tombol + untuk membuat SPK baru.
            </p>
          </div>
        ) : (
          STATUS_ORDER.map((status) => {
          const items = grouped.get(status) ?? [];
          const meta = STATUS_META[status];
          return (
            <section key={status}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <meta.icon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">
                    {meta.label}
                  </h2>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] px-2 py-0.5 border-border/60 text-muted-foreground"
                >
                  {items.length}
                </Badge>
              </div>

              {items.length === 0 ? (
                <EmptySection label={meta.label.toLowerCase()} />
              ) : (
                <div className="flex flex-col gap-3">
                  {items.map((spk) => (
                    <SpkCardItem
                      key={spk.id}
                      spk={spk}
                      onClick={() => navigate(`/spk/${spk.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
          })
        )}
      </main>

      {/* Floating action button */}
      <div className="fixed bottom-6 right-4 z-40">
        <Button
          onClick={handleNewSPK}
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow-sm)] hover:bg-primary/90 hover:shadow-[var(--shadow-glow)] active:scale-95 transition-all duration-200"
          aria-label="SPK Baru"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Safe-area bottom padding for FAB clearance */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
