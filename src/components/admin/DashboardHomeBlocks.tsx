import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useDashboardBadges } from "@/hooks/useDashboardBadges";
import {
  CalendarCheck, Clock, AlertTriangle, Bug, ShieldAlert,
  MessageSquareWarning, Users, Wallet, BarChart2, FileBarChart,
} from "lucide-react";
import { trackMenuClick, useTopMenus } from "@/hooks/useMenuUsage";
import { Button } from "@/components/ui/button";

// ── Quick Access (top-5 menu paling sering dipakai) ─────────────────────────

export const QuickAccessGrid = () => {
  const navigate = useNavigate();
  const { badgeFor } = useDashboardBadges();
  const { isStaff, isAdminCabang } = useUserRole();
  const tiles = useTopMenus(5, { isStaff, isAdminCabang });

  if (tiles.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-[13px] font-semibold tracking-wide text-foreground/90 uppercase">
        Quick Access · Sering Dipakai
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {tiles.map((m) => {
          const url = m.url;
          const Icon = m.icon;
          const title = m.title;
          const badge = badgeFor(url);
          return (
            <button
              key={url}
              type="button"
              onClick={() => { trackMenuClick(url); navigate(url); }}
              className="group relative rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl p-4 flex flex-col items-center justify-center text-center gap-3 min-h-[120px] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_18px_hsl(var(--primary)/0.18)] hover:border-primary/40 active:scale-[0.98]"
            >
              {badge > 0 && (
                <span className="absolute top-2 right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground shadow-sm ring-2 ring-background">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
              <div className="h-11 w-11 rounded-lg flex items-center justify-center bg-primary/10 text-primary shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[12.5px] font-semibold text-foreground/90 leading-tight">
                {title}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

// ── Need Attention ──────────────────────────────────────────────────────────

interface AttentionRow {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  url: string;
  tone: "amber" | "red" | "blue" | "violet";
}

const toneRing: Record<AttentionRow["tone"], string> = {
  amber:  "border-amber-500/30 bg-amber-500/5",
  red:    "border-red-500/30 bg-red-500/5",
  blue:   "border-blue-500/30 bg-blue-500/5",
  violet: "border-violet-500/30 bg-violet-500/5",
};
const toneIcon: Record<AttentionRow["tone"], string> = {
  amber:  "text-amber-500 bg-amber-500/10",
  red:    "text-red-500 bg-red-500/10",
  blue:   "text-blue-500 bg-blue-500/10",
  violet: "text-violet-500 bg-violet-500/10",
};

export const NeedAttention = () => {
  const navigate = useNavigate();
  const { isStaff } = useUserRole();
  const { counts } = useDashboardBadges();
  const [lateBookings, setLateBookings] = useState(0);
  const [correctionRequests, setCorrectionRequests] = useState(0);
  const [openBugs, setOpenBugs] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const [lateRes, corrRes, bugRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .lt("created_at", thirtyMinAgo),
        isStaff
          ? supabase.from("correction_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending")
          : Promise.resolve({ count: 0 } as any),
        supabase
          .from("internal_reports" as any)
          .select("id", { count: "exact", head: true })
          .eq("category", "bug")
          .eq("status", "open"),
      ]);
      if (!active) return;
      setLateBookings(lateRes.count || 0);
      setCorrectionRequests((corrRes as any)?.count || 0);
      setOpenBugs((bugRes as any)?.count || 0);
    };
    load();
    const ch = supabase
      .channel("need-attention")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "internal_reports" }, load)
      .subscribe();
    const t = setInterval(load, 60_000);
    return () => { active = false; supabase.removeChannel(ch); clearInterval(t); };
  }, [isStaff]);

  const allRows: AttentionRow[] = [
    { icon: Clock,                label: "Booking terlambat konfirmasi", count: lateBookings,           url: "/dashboard/bookings",            tone: "amber" as const },
    { icon: MessageSquareWarning, label: "Keluhan kendaraan baru",       count: counts.newComplaints,   url: "/dashboard/complaints",          tone: "red" as const },
    { icon: ShieldAlert,          label: "Permintaan koreksi",           count: correctionRequests,     url: "/dashboard/correction-requests", tone: "violet" as const },
    { icon: Bug,                  label: "Bug kritikal",                 count: openBugs,               url: "/dashboard/feedback",            tone: "red" as const },
  ];
  const rows = allRows.filter(r => r.count > 0);

  return (
    <section className="space-y-3">
      <h3 className="text-[13px] font-semibold tracking-wide text-foreground/90 uppercase flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        Perlu Perhatian
      </h3>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl p-6 text-center text-sm text-muted-foreground">
          Semua aman — tidak ada antrian aksi saat ini. 🎉
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.label}
                className={`flex items-center gap-3 rounded-xl border ${toneRing[r.tone]} backdrop-blur-xl p-3`}
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneIcon[r.tone]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.count} item butuh aksi</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { trackMenuClick(r.url); navigate(r.url); }}>
                  Lihat
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};