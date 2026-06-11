import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Row {
  id: string;
  referrer: string;
  referee: string;
  booking_id: string | null;
  status: string;
  amount: number;
  type: string;
  created_at: string;
}

const fmtIDR = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function ReferralTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("referral_commissions")
        .select("id,referrer_id,referee_id,booking_id,status,amount,type,created_at")
        .order("created_at", { ascending: false }).limit(100);
      const ids = new Set<string>();
      (data || []).forEach((d: any) => { ids.add(d.referrer_id); ids.add(d.referee_id); });
      const { data: profiles } = await supabase.from("profiles").select("id,full_name").in("id", Array.from(ids));
      const nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name || "—"]));
      setRows((data || []).map((d: any) => ({
        id: d.id,
        referrer: nameMap[d.referrer_id] || "—",
        referee: nameMap[d.referee_id] || "—",
        booking_id: d.booking_id,
        status: d.status,
        amount: Number(d.amount || 0),
        type: d.type,
        created_at: d.created_at,
      })));
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Referral History
          <Badge variant="outline" className="ml-auto text-xs">{rows.length} entries</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Belum ada aktivitas referral</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referee</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Reward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-xs">{r.referrer}</TableCell>
                      <TableCell className="text-xs">{r.referee}</TableCell>
                      <TableCell className="text-xs font-mono">{r.booking_id ? `#${r.booking_id.slice(0, 6).toUpperCase()}` : "—"}</TableCell>
                      <TableCell className="text-xs capitalize">{r.type}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{r.status}</Badge></TableCell>
                      <TableCell className="text-right text-xs font-semibold">{fmtIDR(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-1">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{r.referrer} → {r.referee}</p>
                    <p className="text-sm font-bold whitespace-nowrap">{fmtIDR(r.amount)}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary" className="text-[10px] capitalize">{r.type} · {r.status}</Badge>
                    <p className="text-[11px] text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy")}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}