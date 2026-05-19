import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Req = {
  id: string;
  booking_id: string;
  requested_by: string;
  requester_role: string | null;
  target_table: string;
  field: string;
  from_value: string | null;
  to_value: string;
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  _requester?: { full_name: string | null } | null;
  _booking?: { customer_name: string; service_name: string; branch: string | null } | null;
};

const fmt = (s: string) =>
  new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function CorrectionRequestsPanel() {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Req | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("status_change_requests" as any)
      .select("*")
      .eq("status", tab)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data || []) as unknown as Req[];
    const reqIds = Array.from(new Set(list.map((r) => r.requested_by)));
    const bookIds = Array.from(new Set(list.map((r) => r.booking_id)));
    const [{ data: profs }, { data: books }] = await Promise.all([
      reqIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", reqIds)
        : Promise.resolve({ data: [] as any[] }),
      bookIds.length
        ? supabase
            .from("bookings")
            .select("id, customer_name, service_name, branch")
            .in("id", bookIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const pMap: Record<string, any> = {};
    (profs || []).forEach((p: any) => (pMap[p.id] = p));
    const bMap: Record<string, any> = {};
    (books || []).forEach((b: any) => (bMap[b.id] = b));
    setRows(
      list.map((r) => ({ ...r, _requester: pMap[r.requested_by] || null, _booking: bMap[r.booking_id] || null })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [tab]);

  const approve = async (r: Req) => {
    setBusy(r.id);
    const { error } = await supabase.rpc("apply_status_change_request" as any, { _id: r.id, _note: null });
    setBusy(null);
    if (error) {
      toast.error("Gagal menyetujui", { description: error.message });
      return;
    }
    toast.success("Permintaan disetujui");
    load();
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setBusy(rejectTarget.id);
    const { error } = await supabase.rpc("reject_status_change_request" as any, {
      _id: rejectTarget.id,
      _note: rejectNote.trim() || null,
    });
    setBusy(null);
    if (error) {
      toast.error("Gagal menolak", { description: error.message });
      return;
    }
    toast.success("Permintaan ditolak");
    setRejectTarget(null);
    setRejectNote("");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Permintaan Koreksi Status</CardTitle>
            <CardDescription>
              Pengajuan koreksi mundur dari CS Pusat & Admin Cabang. Hanya Owner yang dapat menyetujui.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border p-0.5 text-xs">
              {(["pending", "approved", "rejected"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {t === "pending" ? "Pending" : t === "approved" ? "Disetujui" : "Ditolak"}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Muat ulang
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10">Belum ada permintaan {tab}.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Pengaju</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Dari → Menjadi</TableHead>
                  <TableHead>Alasan</TableHead>
                  {tab === "pending" && <TableHead>Aksi</TableHead>}
                  {tab !== "pending" && <TableHead>Catatan Review</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{fmt(r.created_at)}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{r._requester?.full_name || r.requested_by.slice(0, 8)}</div>
                      {r.requester_role && (
                        <Badge variant="outline" className="text-[10px] h-4 mt-0.5">
                          {r.requester_role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px]">
                      <div className="font-medium truncate">{r._booking?.customer_name || r.booking_id.slice(0, 8)}</div>
                      <div className="text-muted-foreground truncate">{r._booking?.service_name}</div>
                      {r._booking?.branch && (
                        <div className="text-[10px] capitalize text-muted-foreground">{r._booking.branch}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{r.field}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="line-through text-muted-foreground">{r.from_value || "-"}</span>
                      {" → "}
                      <span className="font-semibold text-primary">{r.to_value}</span>
                    </TableCell>
                    <TableCell className="text-xs max-w-[260px]">
                      <p className="line-clamp-2" title={r.reason}>
                        {r.reason}
                      </p>
                    </TableCell>
                    {tab === "pending" ? (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={busy === r.id}
                            onClick={() => approve(r)}
                          >
                            <Check className="h-3 w-3" /> Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-red-600 border-red-500/40"
                            disabled={busy === r.id}
                            onClick={() => setRejectTarget(r)}
                          >
                            <X className="h-3 w-3" /> Tolak
                          </Button>
                        </div>
                      </TableCell>
                    ) : (
                      <TableCell className="text-xs max-w-[200px] truncate" title={r.review_note || ""}>
                        {r.review_note || "-"}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Permintaan Koreksi</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Catatan penolakan (opsional)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={reject} disabled={!!busy}>
              Tolak Permintaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
