import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, ChevronRight, Download, ShieldAlert } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";
import { Undo2 } from "lucide-react";
import FilterBarV2, { type QuickChip, type ActiveChip } from "./filters/FilterBarV2";
import { DEFAULT_TIMELINE, type TimelineValue, getTimelineRange, isTimelineDefault } from "@/utils/timelineFilter";

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  before: any;
  after: any;
  metadata: any;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "user.role_change": { label: "Ubah Role", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  "user.password_reset": { label: "Reset Password", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  "user.delete": { label: "Hapus User", color: "bg-destructive/15 text-destructive" },
  "user.verify": { label: "Verifikasi User", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  "payment.status_change": { label: "Ubah Status Bayar", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  "withdrawal.status_change": { label: "Withdrawal", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  "loyalty.points_change": { label: "Ubah Poin", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" },
  "manual_payment.review": { label: "Review Bukti Bayar", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
  "booking.delete": { label: "Hapus Transaksi", color: "bg-destructive/15 text-destructive" },
  "booking.restore": { label: "Pulihkan Transaksi", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};

const SEVERITY: Record<"high" | "medium" | "low", string[]> = {
  high: ["user.delete", "booking.delete", "user.role_change"],
  medium: ["user.password_reset", "user.verify", "payment.status_change", "manual_payment.review", "withdrawal.status_change"],
  low: ["booking.restore", "loyalty.points_change"],
};
const severityOf = (action: string): "high" | "medium" | "low" | "other" => {
  if (SEVERITY.high.includes(action)) return "high";
  if (SEVERITY.medium.includes(action)) return "medium";
  if (SEVERITY.low.includes(action)) return "low";
  return "other";
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
};

const AuditLogPanel = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [timeline, setTimeline] = useState<TimelineValue>(DEFAULT_TIMELINE);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const { isStaff } = useUserRole();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const restoredTargets = new Set(
    rows.filter((r) => r.action === "booking.restore").map((r) => r.target_id),
  );

  const handleRestore = async (auditId: string) => {
    setRestoringId(auditId);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-restore-booking",
        { body: { audit_log_id: auditId } },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Transaksi dipulihkan", description: "Booking berhasil dikembalikan dengan status Cancelled." });
      await load();
    } catch (e: any) {
      toast({
        title: "Gagal memulihkan",
        description: e?.message || "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setRestoringId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const list: AuditRow[] = data ?? [];
    setRows(list);

    // Resolve actor names
    const ids = Array.from(new Set(list.map((r) => r.actor_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.id.slice(0, 8); });
      setActorNames(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (actionFilter !== "all" && r.action !== actionFilter) return false;
    if (severityFilter !== "all" && severityOf(r.action) !== severityFilter) return false;
    if (!isTimelineDefault(timeline)) {
      const { start, end } = getTimelineRange(timeline);
      const ts = new Date(r.created_at).getTime();
      if (start && ts < start.getTime()) return false;
      if (end && ts > end.getTime()) return false;
    }
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.action.toLowerCase().includes(s) ||
      (r.target_label || "").toLowerCase().includes(s) ||
      (r.target_id || "").toLowerCase().includes(s) ||
      (actorNames[r.actor_id || ""] || "").toLowerCase().includes(s)
    );
  });

  const exportCsv = () => {
    const header = "Waktu,Aktor,Role,Action,Target,Target ID,Before,After\n";
    const body = filtered.map((r) =>
      [
        formatDate(r.created_at),
        actorNames[r.actor_id || ""] || r.actor_id || "system",
        r.actor_role || "",
        r.action,
        (r.target_label || "").replace(/,/g, ";"),
        r.target_id || "",
        JSON.stringify(r.before || {}).replace(/,/g, ";"),
        JSON.stringify(r.after || {}).replace(/,/g, ";"),
      ].join(",")
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniqueActions = Array.from(new Set(rows.map((r) => r.action)));

  const resetAll = () => {
    setSearch(""); setActionFilter("all"); setSeverityFilter("all"); setTimeline(DEFAULT_TIMELINE);
  };
  const quickChips: QuickChip[] = [
    { key: "high", label: "🔴 High", active: severityFilter === "high", onClick: () => setSeverityFilter(severityFilter === "high" ? "all" : "high") },
    { key: "med", label: "🟠 Medium", active: severityFilter === "medium", onClick: () => setSeverityFilter(severityFilter === "medium" ? "all" : "medium") },
    { key: "low", label: "🟢 Low", active: severityFilter === "low", onClick: () => setSeverityFilter(severityFilter === "low" ? "all" : "low") },
    { key: "today", label: "Hari Ini", active: timeline.preset === "today", onClick: () => setTimeline(timeline.preset === "today" ? DEFAULT_TIMELINE : { preset: "today" }) },
    { key: "week", label: "Minggu Ini", active: timeline.preset === "this_week", onClick: () => setTimeline(timeline.preset === "this_week" ? DEFAULT_TIMELINE : { preset: "this_week" }) },
    { key: "month", label: "Bulan Ini", active: timeline.preset === "this_month", onClick: () => setTimeline(timeline.preset === "this_month" ? DEFAULT_TIMELINE : { preset: "this_month" }) },
  ];
  const activeChips: ActiveChip[] = [];
  if (actionFilter !== "all") activeChips.push({ key: "act", label: `Aksi: ${ACTION_LABELS[actionFilter]?.label || actionFilter}`, onRemove: () => setActionFilter("all") });
  if (severityFilter !== "all") activeChips.push({ key: "sev", label: `Severity: ${severityFilter}`, onRemove: () => setSeverityFilter("all") });
  if (!isTimelineDefault(timeline)) activeChips.push({ key: "tl", label: `Periode: ${timeline.preset}`, onRemove: () => setTimeline(DEFAULT_TIMELINE) });
  const isActive = activeChips.length > 0 || !!search;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Audit Log Aksi Sensitif</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <FilterBarV2
            search={{ placeholder: "Cari aktor / target / aksi...", value: search, onChange: setSearch }}
            quickChips={quickChips}
            activeChips={activeChips}
            resultCount={filtered.length}
            isActive={isActive}
            onReset={resetAll}
            exportButton={
              <Button variant="outline" size="sm" onClick={load} className="h-9">Refresh</Button>
            }
            advanced={{
              badge: activeChips.length,
              timeline: { value: timeline, onChange: setTimeline },
              dropdowns: [
                { key: "act", label: "Jenis Aksi", value: actionFilter, onChange: setActionFilter, options: [
                  { label: "Semua aksi", value: "all" },
                  ...uniqueActions.map((a) => ({ label: ACTION_LABELS[a]?.label || a, value: a })),
                ]},
                { key: "sev", label: "Severity", value: severityFilter, onChange: setSeverityFilter, options: [
                  { label: "Semua", value: "all" },
                  { label: "🔴 High", value: "high" },
                  { label: "🟠 Medium", value: "medium" },
                  { label: "🟢 Low", value: "low" },
                ]},
              ],
            }}
          />

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat audit log...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Belum ada catatan audit yang cocok.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const meta = ACTION_LABELS[r.action] || { label: r.action, color: "bg-muted text-muted-foreground" };
                return (
                  <Collapsible key={r.id}>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={meta.color + " border-0"}>{meta.label}</Badge>
                            {r.actor_role && <Badge variant="outline" className="text-xs">{r.actor_role}</Badge>}
                            <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                          </div>
                          <div className="mt-1.5 text-sm">
                            <span className="font-medium">{actorNames[r.actor_id || ""] || r.actor_id?.slice(0, 8) || "system"}</span>
                            {r.target_label && <> &rarr; <span className="text-muted-foreground">{r.target_label}</span></>}
                          </div>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="shrink-0">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent className="mt-3 pt-3 border-t space-y-2 text-xs">
                        {r.action === "booking.delete" && isStaff && r.before?.id && (
                          <div className="flex items-center justify-between gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2">
                            <div className="text-xs text-muted-foreground">
                              {restoredTargets.has(r.before?.id)
                                ? "Transaksi ini sudah pernah dipulihkan."
                                : "Pulihkan transaksi ini dari snapshot. Pembayaran/invoice anak tidak ikut dikembalikan."}
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="shrink-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                                  disabled={restoringId === r.id || restoredTargets.has(r.before?.id)}
                                >
                                  {restoringId === r.id ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                  ) : (
                                    <Undo2 className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  Pulihkan
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Pulihkan Transaksi?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Booking <b>{r.target_label}</b> akan dibuat ulang dengan status <b>Cancelled</b> dan payment <b>Unpaid</b>.
                                    Data pembayaran, invoice, dan log status tidak ikut dipulihkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRestore(r.id)}>
                                    Ya, Pulihkan
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                        {r.before && (
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Sebelum:</div>
                            <pre className="bg-muted/50 p-2 rounded overflow-x-auto">{JSON.stringify(r.before, null, 2)}</pre>
                          </div>
                        )}
                        {r.after && (
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Sesudah:</div>
                            <pre className="bg-muted/50 p-2 rounded overflow-x-auto">{JSON.stringify(r.after, null, 2)}</pre>
                          </div>
                        )}
                        {r.metadata && Object.keys(r.metadata).length > 0 && (
                          <div>
                            <div className="font-medium text-muted-foreground mb-1">Metadata:</div>
                            <pre className="bg-muted/50 p-2 rounded overflow-x-auto">{JSON.stringify(r.metadata, null, 2)}</pre>
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogPanel;
