// Phase 5.2 — SPK Work Queue UI (Design Only)
// Mobile-first operational surface for Service Advisor / Foreman / Mechanic.
// Pure UI with static placeholder data — no runtime, no service calls.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User2,
  Car,
  Hash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
// Static placeholder data

const MOCK_SPKS: SpkCard[] = [
  {
    id: "spk-001",
    spk_number: "SPK-2026-000101",
    customer_name: "Budi Santoso",
    vehicle_desc: "Toyota Avanza 1.3 G · 2020 · Hitam",
    plate_number: "B 1234 XYZ",
    status: "in_progress",
    progress_pct: 55,
    entry_time: "08:30",
    priority: "high",
    phone: "0812-1234-5678",
  },
  {
    id: "spk-002",
    spk_number: "SPK-2026-000102",
    customer_name: "Siti Aminah",
    vehicle_desc: "Honda Brio RS · 2021 · Putih",
    plate_number: "B 5678 ABC",
    status: "in_progress",
    progress_pct: 30,
    entry_time: "09:00",
    priority: "normal",
    phone: "0813-9876-5432",
  },
  {
    id: "spk-003",
    spk_number: "SPK-2026-000103",
    customer_name: "Ahmad Fauzi",
    vehicle_desc: "Mitsubishi Xpander · 2019 · Silver",
    plate_number: "B 9012 DEF",
    status: "pending",
    progress_pct: 0,
    entry_time: "09:15",
    priority: "high",
    phone: "0821-1122-3344",
  },
  {
    id: "spk-004",
    spk_number: "SPK-2026-000104",
    customer_name: "Dewi Lestari",
    vehicle_desc: "Suzuki Ertiga · 2022 · Abu-abu",
    plate_number: "B 3456 GHI",
    status: "pending",
    progress_pct: 0,
    entry_time: "10:00",
    priority: "normal",
    phone: "0856-5566-7788",
  },
  {
    id: "spk-005",
    spk_number: "SPK-2026-000105",
    customer_name: "Rudi Hartono",
    vehicle_desc: "Daihatsu Ayla · 2020 · Merah",
    plate_number: "B 7890 JKL",
    status: "waiting_approval",
    progress_pct: 75,
    entry_time: "07:45",
    priority: "normal",
    phone: "0811-2233-4455",
  },
  {
    id: "spk-006",
    spk_number: "SPK-2026-000106",
    customer_name: "Lina Kusuma",
    vehicle_desc: "Nissan Livina · 2018 · Biru",
    plate_number: "B 2345 MNO",
    status: "waiting_approval",
    progress_pct: 90,
    entry_time: "08:00",
    priority: "high",
    phone: "0838-3344-5566",
  },
  {
    id: "spk-007",
    spk_number: "SPK-2026-000107",
    customer_name: "Yanto Wijaya",
    vehicle_desc: "Toyota Innova · 2021 · Hitam",
    plate_number: "B 6789 PQR",
    status: "completed_today",
    progress_pct: 100,
    entry_time: "07:00",
    priority: "normal",
    phone: "0877-8899-0011",
  },
  {
    id: "spk-008",
    spk_number: "SPK-2026-000108",
    customer_name: "Maya Sari",
    vehicle_desc: "Honda HR-V · 2023 · Putih",
    plate_number: "B 0123 STU",
    status: "completed_today",
    progress_pct: 100,
    entry_time: "06:30",
    priority: "normal",
    phone: "0812-5566-0099",
  },
  {
    id: "spk-009",
    spk_number: "SPK-2026-000109",
    customer_name: "Bayu Prasetyo",
    vehicle_desc: "Wuling Almaz · 2022 · Silver",
    plate_number: "B 4567 VWX",
    status: "in_progress",
    progress_pct: 80,
    entry_time: "08:45",
    priority: "normal",
    phone: "0852-2211-3344",
  },
  {
    id: "spk-010",
    spk_number: "SPK-2026-000110",
    customer_name: "Nina Anggraini",
    vehicle_desc: "Hyundai Stargazer · 2023 · Abu-abu",
    plate_number: "B 8901 YZA",
    status: "pending",
    progress_pct: 0,
    entry_time: "10:30",
    priority: "high",
    phone: "0889-7766-5544",
  },
];

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
  const { toast } = useToast();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_SPKS;
    return MOCK_SPKS.filter(
      (s) =>
        s.spk_number.toLowerCase().includes(q) ||
        s.customer_name.toLowerCase().includes(q) ||
        s.plate_number.toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q),
    );
  }, [query]);

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
    toast({
      title: "SPK Baru",
      description: "Form pembuatan SPK akan tersedia di Phase 5.3.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Sticky search header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Antrian SPK
            </h1>
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
        {STATUS_ORDER.map((status) => {
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
        })}
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
