import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tag, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Row {
  booking_id: string;
  customer_name: string;
  branch: string | null;
  discount_code: string | null;
  discount_label: string | null;
  discount_amount: number;
  created_at: string;
}

const fmtIDR = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function PromoTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id,customer_name,branch,discount_code,discount_label,discount_amount,discount_source,promo_claim_id,created_at")
        .or("promo_claim_id.not.is.null,discount_source.eq.promo")
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data || []).map((b: any) => ({
        booking_id: b.id,
        customer_name: b.customer_name,
        branch: b.branch,
        discount_code: b.discount_code,
        discount_label: b.discount_label,
        discount_amount: Number(b.discount_amount || 0),
        created_at: b.created_at,
      })));
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" /> Promo History
          <Badge variant="outline" className="ml-auto text-xs">{rows.length} entries</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Belum ada penggunaan promo</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Promo</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead className="text-right">Diskon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.booking_id}>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-xs">{r.discount_label || r.discount_code || "—"}</TableCell>
                      <TableCell className="text-xs">{r.customer_name}</TableCell>
                      <TableCell className="text-xs">{r.branch || "—"}</TableCell>
                      <TableCell className="text-xs font-mono">#{r.booking_id.slice(0, 6).toUpperCase()}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{fmtIDR(r.discount_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-2">
              {rows.map((r) => (
                <div key={r.booking_id} className="rounded-xl border border-border bg-card p-3 space-y-1">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{r.discount_label || r.discount_code || "Promo"}</p>
                    <p className="text-sm font-bold whitespace-nowrap">{fmtIDR(r.discount_amount)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.customer_name} · {r.branch || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy")} · #{r.booking_id.slice(0, 6).toUpperCase()}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}