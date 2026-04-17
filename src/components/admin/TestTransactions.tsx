import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import TestPaymentButton from "./TestPaymentButton";

interface TestRow {
  id: string;
  order_id: string;
  booking_id: string | null;
  amount: number;
  status: string;
  created_at: string;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    paid: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    pending_payment: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <Badge variant="outline" className={map[status] || "bg-muted"}>{status}</Badge>;
};

const TestTransactions = () => {
  const [rows, setRows] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    // Pull test logs from activity_logs where metadata.test = true
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, description, metadata, created_at")
      .eq("type", "payment")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Fetch error:", error);
      if (!silent) setLoading(false);
      return;
    }

    const tests = (data ?? [])
      .filter((r) => {
        const meta = r.metadata as Record<string, unknown> | null;
        return meta && meta.test === true && typeof meta.order_id === "string";
      })
      .map((r) => {
        const meta = r.metadata as Record<string, unknown>;
        return {
          id: r.id,
          order_id: String(meta.order_id),
          booking_id: (meta.booking_id as string) ?? null,
          amount: Number(meta.amount ?? 0),
          status: "pending",
          created_at: r.created_at,
        } as TestRow;
      });

    // Hydrate latest payment status per booking_id
    const bookingIds = tests.map((t) => t.booking_id).filter(Boolean) as string[];
    if (bookingIds.length) {
      const { data: payments } = await supabase
        .from("payments")
        .select("booking_id, payment_status, updated_at")
        .in("booking_id", bookingIds)
        .order("updated_at", { ascending: false });

      const statusByBooking = new Map<string, string>();
      (payments ?? []).forEach((p) => {
        if (!statusByBooking.has(p.booking_id)) statusByBooking.set(p.booking_id, p.payment_status);
      });
      tests.forEach((t) => {
        if (t.booking_id && statusByBooking.has(t.booking_id)) {
          t.status = statusByBooking.get(t.booking_id)!;
        }
      });
    }

    setRows(tests);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // Auto-refresh every 5s while any row is still pending
  useEffect(() => {
    const hasPending = rows.some((r) => r.status === "pending" || r.status === "pending_payment");
    if (!hasPending) return;
    const id = setInterval(() => fetchRows(true), 5000);
    return () => clearInterval(id);
  }, [rows, fetchRows]);

  return (
    <div className="space-y-6">
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Test Transactions</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Catatan one-click test Midtrans (sandbox)</p>
          </div>
          <div className="flex gap-2">
            <TestPaymentButton onComplete={() => fetchRows()} />
            <Button size="sm" variant="ghost" onClick={() => fetchRows()} className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              Belum ada test transaksi. Klik <strong>Test Payment Midtrans</strong> untuk memulai.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.order_id}</TableCell>
                    <TableCell>{formatIDR(r.amount)}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd MMM yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestTransactions;
