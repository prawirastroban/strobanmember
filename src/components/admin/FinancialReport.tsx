import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

const formatIDR = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const FinancialReport = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const since = subDays(new Date(), parseInt(dateRange)).toISOString();
      const { data } = await supabase
        .from("payments")
        .select("id,amount,payment_method,payment_status,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      setPayments((data as Payment[]) || []);
      setLoading(false);
    };
    fetch();
  }, [dateRange]);

  const stats = useMemo(() => {
    const success = payments.filter(p => p.payment_status === "success");
    const totalRevenue = success.reduce((s, p) => s + Number(p.amount), 0);
    const totalTx = payments.length;
    const methodMap: Record<string, { count: number; amount: number }> = {};
    success.forEach(p => {
      if (!methodMap[p.payment_method]) methodMap[p.payment_method] = { count: 0, amount: 0 };
      methodMap[p.payment_method].count++;
      methodMap[p.payment_method].amount += Number(p.amount);
    });
    return { totalRevenue, totalTx, methodMap };
  }, [payments]);

  const dailyChart = useMemo(() => {
    const days = parseInt(dateRange);
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const dayLabel = format(subDays(new Date(), i), "dd MMM");
      const rev = payments
        .filter(p => p.payment_status === "success" && format(new Date(p.created_at), "yyyy-MM-dd") === d)
        .reduce((s, p) => s + Number(p.amount), 0);
      result.push({ date: dayLabel, revenue: rev });
    }
    return result;
  }, [payments, dateRange]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Financial Report
        </h3>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15"><DollarSign className="h-5 w-5 text-emerald-400" /></div>
            <div><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-lg font-bold">{formatIDR(stats.totalRevenue)}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/15"><TrendingUp className="h-5 w-5 text-blue-400" /></div>
            <div><p className="text-xs text-muted-foreground">Total Transactions</p><p className="text-lg font-bold">{stats.totalTx}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-2">Payment Method Breakdown</p>
            <div className="space-y-1">
              {Object.entries(stats.methodMap).map(([method, data]) => (
                <div key={method} className="flex justify-between text-sm">
                  <span className="capitalize">{method}</span>
                  <span className="font-medium">{data.count}x — {formatIDR(data.amount)}</span>
                </div>
              ))}
              {Object.keys(stats.methodMap).length === 0 && (
                <p className="text-xs text-muted-foreground">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Revenue Chart */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Daily Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,12%,20%)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(220,8%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220,8%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(220,14%,12%)", border: "1px solid hsl(220,12%,22%)", borderRadius: 12, fontSize: 12 }}
                  formatter={(value: number) => [formatIDR(value), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialReport;
