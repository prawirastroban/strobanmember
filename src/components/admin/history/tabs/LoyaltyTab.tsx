import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gift, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Row {
  id: string;
  kind: "earn" | "redeem";
  points: number;
  value_idr: number;
  description: string;
  user_name: string;
  created_at: string;
}

const fmtIDR = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function LoyaltyTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [tx, rd] = await Promise.all([
        supabase.from("loyalty_transactions")
          .select("id,user_id,points,transaction_type,description,created_at")
          .order("created_at", { ascending: false }).limit(80),
        supabase.from("reward_redemptions")
          .select("id,user_id,points_spent,created_at,reward_id,rewards(name,points_required)")
          .order("created_at", { ascending: false }).limit(80),
      ]);
      const userIds = new Set<string>();
      (tx.data || []).forEach((t: any) => userIds.add(t.user_id));
      (rd.data || []).forEach((r: any) => userIds.add(r.user_id));
      const { data: profiles } = await supabase.from("profiles").select("id,full_name").in("id", Array.from(userIds));
      const nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name || "—"]));

      const earn: Row[] = (tx.data || []).map((t: any) => ({
        id: t.id,
        kind: t.points >= 0 ? "earn" : "redeem",
        points: Math.abs(t.points),
        value_idr: 0,
        description: t.description || t.transaction_type,
        user_name: nameMap[t.user_id] || "—",
        created_at: t.created_at,
      }));
      const redeem: Row[] = (rd.data || []).map((r: any) => ({
        id: r.id,
        kind: "redeem" as const,
        points: r.points_spent,
        value_idr: 0,
        description: r.rewards?.name || "Reward",
        user_name: nameMap[r.user_id] || "—",
        created_at: r.created_at,
      }));
      const merged = [...earn, ...redeem].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" /> Loyalty History
          <Badge variant="outline" className="ml-auto text-xs">{rows.length} entries</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Belum ada aktivitas loyalty</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Point</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={`${r.kind}-${r.id}`}>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={r.kind === "earn" ? "bg-emerald-500/20 text-emerald-400 text-[10px]" : "bg-primary/20 text-primary text-[10px]"}>
                          {r.kind === "earn" ? "Earned" : "Redeemed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.user_name}</TableCell>
                      <TableCell className="text-xs">{r.description}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{r.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-2">
              {rows.map((r) => (
                <div key={`${r.kind}-${r.id}`} className="rounded-xl border border-border bg-card p-3 space-y-1">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{r.description}</p>
                    <p className="text-sm font-bold whitespace-nowrap">{r.points} pt</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.user_name}</p>
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary" className={r.kind === "earn" ? "bg-emerald-500/20 text-emerald-400 text-[10px]" : "bg-primary/20 text-primary text-[10px]"}>
                      {r.kind === "earn" ? "Earned" : "Redeemed"}
                    </Badge>
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