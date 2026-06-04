import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Minus, Loader2, History, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import FilterBarV2, { type QuickChip, type ActiveChip } from "./filters/FilterBarV2";

interface CustomerPoints {
  user_id: string;
  total_points: number;
  profile: {
    full_name: string | null;
    phone: string | null;
    customer_id: string | null;
  } | null;
  email: string;
}

interface Transaction {
  id: string;
  user_id: string;
  points: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

export const LoyaltyPointsManager = () => {
  const [customers, setCustomers] = useState<CustomerPoints[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pointsFilter, setPointsFilter] = useState<"all" | "active" | "zero" | "top">("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPoints | null>(null);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");
  const [pointsAmount, setPointsAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const fetchCustomers = async () => {
    setLoading(true);

    // Get all profiles with their loyalty points
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, customer_id");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      setLoading(false);
      return;
    }

    // Get loyalty points for all users
    const { data: loyaltyData, error: loyaltyError } = await supabase
      .from("loyalty_points")
      .select("user_id, total_points");

    if (loyaltyError) {
      console.error("Error fetching loyalty points:", loyaltyError);
    }

    // Create a map of user_id to points
    const pointsMap = new Map(
      (loyaltyData || []).map((lp) => [lp.user_id, lp.total_points])
    );

    // Combine profiles with their points
    const customersWithPoints: CustomerPoints[] = (profiles || []).map((profile) => ({
      user_id: profile.id,
      total_points: pointsMap.get(profile.id) || 0,
      profile: {
        full_name: profile.full_name,
        phone: profile.phone,
        customer_id: profile.customer_id,
      },
      email: "", // We don't have email in profiles, but we can show name/phone
    }));

    setCustomers(customersWithPoints);
    setLoading(false);
  };

  const fetchTransactionHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from("loyalty_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transaction history");
    } else {
      setTransactions(data || []);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAdjustPoints = async () => {
    if (!selectedCustomer || !pointsAmount || !user) return;

    const points = parseInt(pointsAmount);
    if (isNaN(points) || points <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }

    setSubmitting(true);

    const adjustedPoints = adjustType === "deduct" ? -points : points;

    const { error } = await supabase.rpc("adjust_loyalty_points", {
      _user_id: selectedCustomer.user_id,
      _points: adjustedPoints,
      _transaction_type: adjustType,
      _description: description || null,
      _created_by: user.id,
    });

    if (error) {
      console.error("Error adjusting points:", error);
      toast.error("Failed to adjust points", { description: error.message });
    } else {
      toast.success(
        `${adjustType === "add" ? "Added" : "Deducted"} ${points} points`,
        {
          description: `Points ${adjustType === "add" ? "added to" : "deducted from"} ${selectedCustomer.profile?.full_name || "customer"}`,
        }
      );
      setShowAdjustDialog(false);
      setPointsAmount("");
      setDescription("");
      fetchCustomers();
    }

    setSubmitting(false);
  };

  const openAdjustDialog = (customer: CustomerPoints, type: "add" | "deduct") => {
    setSelectedCustomer(customer);
    setAdjustType(type);
    setShowAdjustDialog(true);
  };

  const openHistoryDialog = async (customer: CustomerPoints) => {
    setSelectedCustomer(customer);
    await fetchTransactionHistory(customer.user_id);
    setShowHistoryDialog(true);
  };

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch =
      !searchTerm ||
      (customer.profile?.full_name?.toLowerCase().includes(searchLower) ?? false) ||
      (customer.profile?.phone?.includes(searchTerm) ?? false) ||
      (customer.profile?.customer_id?.toLowerCase().includes(searchLower) ?? false);
    if (!matchSearch) return false;
    if (pointsFilter === "active" && customer.total_points <= 0) return false;
    if (pointsFilter === "zero" && customer.total_points !== 0) return false;
    if (pointsFilter === "top" && customer.total_points < 1000) return false;
    return true;
  });

  const counts = {
    active: customers.filter((c) => c.total_points > 0).length,
    zero: customers.filter((c) => c.total_points === 0).length,
    top: customers.filter((c) => c.total_points >= 1000).length,
  };

  const quickChips: QuickChip[] = [
    { key: "active", label: "⭐ Member Aktif", active: pointsFilter === "active", count: counts.active, onClick: () => setPointsFilter(pointsFilter === "active" ? "all" : "active") },
    { key: "zero", label: "🆕 Belum Ada Poin", active: pointsFilter === "zero", count: counts.zero, onClick: () => setPointsFilter(pointsFilter === "zero" ? "all" : "zero") },
    { key: "top", label: "🏆 Top Member", active: pointsFilter === "top", count: counts.top, onClick: () => setPointsFilter(pointsFilter === "top" ? "all" : "top") },
  ];
  const activeChips: ActiveChip[] = [];
  if (pointsFilter !== "all") {
    const labelMap: Record<string, string> = { active: "Member Aktif", zero: "Belum Ada Poin", top: "Top Member" };
    activeChips.push({ key: "pf", label: labelMap[pointsFilter], onRemove: () => setPointsFilter("all") });
  }
  const isActiveFilter = activeChips.length > 0 || !!searchTerm;
  const resetAll = () => { setPointsFilter("all"); setSearchTerm(""); };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "add":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Added</Badge>;
      case "deduct":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Deducted</Badge>;
      case "service":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Service</Badge>;
      case "referral":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Referral</Badge>;
      case "reward_redeemed":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Redeemed</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-accent fill-accent" />
              Loyalty Points Management
            </CardTitle>
            <CardDescription>Add or deduct loyalty points for customers</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="font-medium">{customers.length}</span> members
            </div>
            <Button variant="outline" onClick={fetchCustomers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FilterBarV2
          search={{ placeholder: "Cari nama, telepon, atau Customer ID...", value: searchTerm, onChange: setSearchTerm }}
          quickChips={quickChips}
          activeChips={activeChips}
          resultCount={filteredCustomers.length}
          isActive={isActiveFilter}
          onReset={resetAll}
        />

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No customers found
          </div>
        ) : (
          <>
          {/* Desktop table */}
          <div className="rounded-md border admin-table-wrapper hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.user_id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {customer.profile?.customer_id || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {customer.profile?.full_name || "Unknown"}
                    </TableCell>
                    <TableCell>{customer.profile?.phone || "-"}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-primary">
                        {customer.total_points}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdjustDialog(customer, "add")}
                          className="gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdjustDialog(customer, "deduct")}
                          className="gap-1"
                        >
                          <Minus className="h-3 w-3" />
                          Deduct
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openHistoryDialog(customer)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="mobile-card-list md:hidden space-y-3">
            {filteredCustomers.map((customer) => (
              <div key={customer.user_id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {customer.profile?.full_name || "Unknown"}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      {customer.profile?.customer_id || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-primary leading-none">{customer.total_points}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Points</p>
                  </div>
                </div>
                {customer.profile?.phone && (
                  <p className="text-xs text-muted-foreground truncate">{customer.profile.phone}</p>
                )}
                <div className="flex items-center gap-1 pt-2 border-t border-border/60">
                  <Button variant="outline" size="sm" onClick={() => openAdjustDialog(customer, "add")} className="h-8 px-2 gap-1 text-xs flex-1">
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openAdjustDialog(customer, "deduct")} className="h-8 px-2 gap-1 text-xs flex-1">
                    <Minus className="h-3 w-3" /> Deduct
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openHistoryDialog(customer)} className="h-8 px-2">
                    <History className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}

        {/* Adjust Points Dialog */}
        <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {adjustType === "add" ? "Add" : "Deduct"} Points
              </DialogTitle>
              <DialogDescription>
                {adjustType === "add" ? "Add" : "Deduct"} loyalty points for{" "}
                {selectedCustomer?.profile?.full_name || "customer"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="points">Points Amount</Label>
                <Input
                  id="points"
                  type="number"
                  min="1"
                  placeholder="Enter points"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Reason (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Service completion bonus, Manual adjustment..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAdjustDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdjustPoints}
                disabled={submitting || !pointsAmount}
                className={adjustType === "deduct" ? "bg-destructive hover:bg-destructive/90" : ""}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : adjustType === "add" ? (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Points
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4 mr-1" />
                    Deduct Points
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transaction History</DialogTitle>
              <DialogDescription>
                Recent point transactions for{" "}
                {selectedCustomer?.profile?.full_name || "customer"}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(tx.created_at), "dd MMM yyyy HH:mm")}
                        </TableCell>
                        <TableCell>{getTransactionBadge(tx.transaction_type)}</TableCell>
                        <TableCell
                          className={
                            tx.points > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"
                          }
                        >
                          {tx.points > 0 ? "+" : ""}
                          {tx.points}
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default LoyaltyPointsManager;
