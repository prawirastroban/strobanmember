import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  CalendarCheck, Package, Megaphone, Car, Users, Activity,
  Loader2, Search, ChevronLeft, ChevronRight, UserPlus
} from "lucide-react";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  booking: { icon: CalendarCheck, label: "Booking", color: "bg-blue-500/20 text-blue-400" },
  inventory: { icon: Package, label: "Inventory", color: "bg-orange-500/20 text-orange-400" },
  marketing: { icon: Megaphone, label: "Marketing", color: "bg-purple-500/20 text-purple-400" },
  vehicle: { icon: Car, label: "Vehicle", color: "bg-cyan-500/20 text-cyan-400" },
  customer: { icon: UserPlus, label: "Customer", color: "bg-emerald-500/20 text-emerald-400" },
  payment: { icon: Activity, label: "Payment", color: "bg-green-500/20 text-green-400" },
};

const PAGE_SIZE = 30;

const TransactionHistory = () => {
  const { isStaff } = useUserRole();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Role-based type filtering
  const allowedTypes = isStaff
    ? ["booking", "inventory", "marketing", "vehicle", "customer", "payment"]
    : ["booking", "vehicle", "customer", "payment"];

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("activity_logs")
      .select("id,type,description,user_id,created_at,metadata", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    } else {
      query = query.in("type", allowedTypes);
    }

    if (search.trim()) {
      query = query.ilike("description", `%${search.trim()}%`);
    }

    const { data, count } = await query;
    setLogs((data as ActivityLog[]) || []);
    setTotalCount(count || 0);
    setHasMore(((page + 1) * PAGE_SIZE) < (count || 0));
    setLoading(false);
  }, [page, typeFilter, search, isStaff]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(0);
  }, [typeFilter, search]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {allowedTypes.map((t) => (
                  <SelectItem key={t} value={t}>{typeConfig[t]?.label || t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Transaction History
            <Badge variant="outline" className="ml-auto text-xs">{totalCount} records</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No activity logs found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Date</TableHead>
                      <TableHead className="w-[110px]">Type</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const cfg = typeConfig[log.type] || { icon: Activity, label: log.type, color: "bg-muted text-muted-foreground" };
                      const IconComp = cfg.icon;
                      return (
                        <TableRow key={log.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), "dd MMM yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`${cfg.color} text-[10px] gap-1`}>
                              <IconComp className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.description}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages || 1}
                </p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="h-8 gap-1">
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </Button>
                  <Button size="sm" variant="outline" disabled={!hasMore} onClick={() => setPage((p) => p + 1)} className="h-8 gap-1">
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionHistory;
