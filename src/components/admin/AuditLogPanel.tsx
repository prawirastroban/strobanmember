import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown, ChevronRight, Download, ShieldAlert } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [actorNames, setActorNames] = useState<Record<string, string>>({});

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
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Cari aktor / target / aksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua aksi</SelectItem>
                {uniqueActions.map((a) => (
                  <SelectItem key={a} value={a}>{ACTION_LABELS[a]?.label || a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
          </div>

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
