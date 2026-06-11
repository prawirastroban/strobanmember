import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, Loader2, Car } from "lucide-react";
import { format } from "date-fns";

interface Row {
  id: string;
  service_name: string;
  car_type: string | null;
  car_plate_number: string | null;
  branch: string | null;
  status: string;
  service_status: string;
  booking_date: string;
}

export default function ServiceTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id,service_name,car_type,car_plate_number,branch,status,service_status,booking_date")
        .eq("status", "completed")
        .order("booking_date", { ascending: false }).limit(100);
      setRows((data || []) as Row[]);
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" /> Service History
          <Badge variant="outline" className="ml-auto text-xs">{rows.length} entries</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Belum ada servis selesai</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Layanan</TableHead>
                    <TableHead>Kendaraan</TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.booking_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-xs">{r.service_name}</TableCell>
                      <TableCell className="text-xs">{r.car_type || "—"} {r.car_plate_number || ""}</TableCell>
                      <TableCell className="text-xs">{r.branch || "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 text-[10px]">{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-1">
                  <p className="text-sm font-semibold">{r.service_name}</p>
                  {r.car_type && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Car className="h-3 w-3" />{r.car_type} {r.car_plate_number}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 text-[10px]">{r.status}</Badge>
                    <p className="text-[11px] text-muted-foreground">{format(new Date(r.booking_date), "dd MMM yyyy")}</p>
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