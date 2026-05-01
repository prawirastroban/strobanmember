import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useServiceCategories } from "@/hooks/useServiceCategories";
import ServiceMultiPicker from "@/components/admin/ServiceMultiPicker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Gift,
  Plus,
  Pencil,
  RefreshCw,
  Ticket,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  created_at: string;
  applicable_categories?: string[] | null;
  applicable_service_ids?: string[] | null;
}

interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  redemption_code: string;
  status: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  rewards: {
    name: string;
  } | null;
}

interface ProfileMap {
  [userId: string]: string | null;
}

const RewardsManager = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [profileNames, setProfileNames] = useState<ProfileMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    points_required: 100,
    discount_type: "percentage",
    discount_value: 10,
    is_active: true,
    applicable_categories: [] as string[],
    applicable_service_ids: [] as string[],
  });

  const { categories: SERVICE_CATEGORIES } = useServiceCategories({ activeOnly: true });

  const fetchRewards = async () => {
    const { data, error } = await supabase
      .from("rewards")
      .select("*")
      .order("points_required", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error fetching rewards",
        description: error.message,
      });
    } else {
      setRewards(data || []);
    }
  };

  const fetchRedemptions = async () => {
    const { data, error } = await supabase
      .from("reward_redemptions")
      .select(`
        *,
        rewards (name)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error fetching redemptions",
        description: error.message,
      });
    } else {
      const redemptionsData = (data as Redemption[]) || [];
      setRedemptions(redemptionsData);

      // Fetch profile names for unique user IDs
      const userIds = [...new Set(redemptionsData.map((r) => r.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profiles) {
          const names: ProfileMap = {};
          profiles.forEach((p) => {
            names[p.id] = p.full_name;
          });
          setProfileNames(names);
        }
      }
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchRewards(), fetchRedemptions()]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      points_required: 100,
      discount_type: "percentage",
      discount_value: 10,
      is_active: true,
      applicable_categories: [],
      applicable_service_ids: [],
    });
    setEditingReward(null);
  };

  const openEditDialog = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || "",
      points_required: reward.points_required,
      discount_type: reward.discount_type,
      discount_value: reward.discount_value,
      is_active: reward.is_active,
      applicable_categories: reward.applicable_categories ?? [],
      applicable_service_ids: reward.applicable_service_ids ?? [],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Reward name is required",
      });
      return;
    }

    const rewardData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      points_required: formData.points_required,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      is_active: formData.is_active,
      applicable_categories: formData.applicable_categories,
      applicable_service_ids: formData.applicable_service_ids,
    };

    if (editingReward) {
      // Update existing reward
      const { error } = await supabase
        .from("rewards")
        .update(rewardData)
        .eq("id", editingReward.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Update failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Reward updated",
          description: `"${formData.name}" has been updated`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchRewards();
      }
    } else {
      // Create new reward
      const { error } = await supabase.from("rewards").insert(rewardData);

      if (error) {
        toast({
          variant: "destructive",
          title: "Creation failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Reward created",
          description: `"${formData.name}" has been added`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchRewards();
      }
    }
  };

  const toggleRewardActive = async (reward: Reward) => {
    const { error } = await supabase
      .from("rewards")
      .update({ is_active: !reward.is_active })
      .eq("id", reward.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    } else {
      toast({
        title: reward.is_active ? "Reward deactivated" : "Reward activated",
        description: `"${reward.name}" is now ${reward.is_active ? "inactive" : "active"}`,
      });
      fetchRewards();
    }
  };

  const markRedemptionUsed = async (redemptionId: string) => {
    const { error } = await supabase
      .from("reward_redemptions")
      .update({ status: "used", used_at: new Date().toISOString() })
      .eq("id", redemptionId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Redemption marked as used",
      });
      fetchRedemptions();
    }
  };

  const getRedemptionStatus = (redemption: Redemption) => {
    if (redemption.status === "used") {
      return { label: "Used", variant: "secondary" as const, icon: CheckCircle };
    }
    if (new Date(redemption.expires_at) < new Date()) {
      return { label: "Expired", variant: "destructive" as const, icon: XCircle };
    }
    return { label: "Active", variant: "default" as const, icon: Clock };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gift className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Rewards Management</CardTitle>
              <CardDescription>
                Manage reward offers and view customer redemptions
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reward
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingReward ? "Edit Reward" : "Create New Reward"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingReward
                      ? "Update the reward details below"
                      : "Add a new reward that customers can redeem with their points"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Reward Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., 10% Off Next Service"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Describe the reward..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="points">Points Required</Label>
                      <Input
                        id="points"
                        type="number"
                        min={1}
                        value={formData.points_required}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            points_required: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="discount_type">Discount Type</Label>
                      <Select
                        value={formData.discount_type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, discount_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="discount_value">
                        Discount Value{" "}
                        {formData.discount_type === "percentage" ? "(%)" : "($)"}
                      </Label>
                      <Input
                        id="discount_value"
                        type="number"
                        min={1}
                        value={formData.discount_value}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discount_value: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, is_active: checked })
                        }
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Berlaku untuk Kategori Layanan</Label>
                    <p className="text-xs text-muted-foreground">
                      Pilih "Semua Layanan" agar reward berlaku untuk seluruh layanan, atau pilih kategori spesifik.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {(() => {
                        const allChecked = formData.applicable_categories.length === 0;
                        return (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, applicable_categories: [] })}
                            className={`col-span-2 text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                              allChecked
                                ? "bg-primary/15 border-primary text-foreground"
                                : "bg-muted/30 border-border hover:bg-muted/50"
                            }`}
                          >
                            <span className="inline-flex items-center gap-2">
                              <span className={`h-4 w-4 rounded border flex items-center justify-center ${allChecked ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                                {allChecked && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                              </span>
                              Semua Layanan
                            </span>
                          </button>
                        );
                      })()}
                      {SERVICE_CATEGORIES.map((cat) => {
                        const checked = formData.applicable_categories.includes(cat.value);
                        return (
                          <button
                            type="button"
                            key={cat.value}
                            onClick={() => {
                              const next = checked
                                ? formData.applicable_categories.filter((c) => c !== cat.value)
                                : [...formData.applicable_categories, cat.value];
                              setFormData({ ...formData, applicable_categories: next });
                            }}
                            className={`text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                              checked
                                ? "bg-primary/15 border-primary text-foreground"
                                : "bg-muted/30 border-border hover:bg-muted/50"
                            }`}
                          >
                            <span className="inline-flex items-center gap-2">
                              <span className={`h-4 w-4 rounded border flex items-center justify-center ${checked ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                                {checked && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                              </span>
                              {cat.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingReward ? "Update" : "Create"} Reward
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rewards">
          <TabsList className="mb-4">
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Rewards ({rewards.length})
            </TabsTrigger>
            <TabsTrigger value="redemptions" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Redemptions ({redemptions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rewards">
            {/* Desktop table */}
            <div className="rounded-md border admin-table-wrapper hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reward</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : rewards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No rewards created yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    rewards.map((reward) => (
                      <TableRow key={reward.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{reward.name}</p>
                            {reward.description && (
                              <p className="text-sm text-muted-foreground">
                                {reward.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-medium">
                            {reward.points_required.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {reward.discount_type === "percentage"
                            ? `${reward.discount_value}%`
                            : `$${reward.discount_value}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={reward.is_active ? "default" : "secondary"}>
                            {reward.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(reward)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRewardActive(reward)}
                            >
                              {reward.is_active ? (
                                <XCircle className="h-4 w-4 text-destructive" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="mobile-card-list md:hidden space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : rewards.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No rewards created yet</div>
              ) : (
                rewards.map((reward) => (
                  <div key={reward.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{reward.name}</p>
                        {reward.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{reward.description}</p>
                        )}
                      </div>
                      <Badge variant={reward.is_active ? "default" : "secondary"} className="shrink-0 text-[10px]">
                        {reward.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {reward.points_required.toLocaleString()} pts
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {reward.discount_type === "percentage" ? `${reward.discount_value}%` : `$${reward.discount_value}`}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/60">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(reward)} className="h-8 px-2 text-xs">
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleRewardActive(reward)} className="h-8 px-2 text-xs">
                        {reward.is_active ? (
                          <><XCircle className="h-3.5 w-3.5 mr-1 text-destructive" /> Off</>
                        ) : (
                          <><CheckCircle className="h-3.5 w-3.5 mr-1 text-primary" /> On</>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="redemptions">
            {/* Desktop table */}
            <div className="rounded-md border admin-table-wrapper hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : redemptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No redemptions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    redemptions.map((redemption) => {
                      const status = getRedemptionStatus(redemption);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={redemption.id}>
                        <TableCell>
                          <p className="font-medium">
                            {profileNames[redemption.user_id] || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {redemption.user_id.slice(0, 8)}...
                          </p>
                        </TableCell>
                          <TableCell>
                            {redemption.rewards?.name || "Unknown Reward"}
                          </TableCell>
                          <TableCell>
                            <code className="bg-muted px-2 py-1 rounded text-sm">
                              {redemption.redemption_code}
                            </code>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">
                              {redemption.points_spent.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">
                                {format(new Date(redemption.expires_at), "dd MMM yyyy")}
                              </p>
                              {redemption.used_at && (
                                <p className="text-xs text-muted-foreground">
                                  Used: {format(new Date(redemption.used_at), "MMM d")}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {redemption.status === "active" &&
                              new Date(redemption.expires_at) >= new Date() && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markRedemptionUsed(redemption.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1 text-primary" />
                                  Mark Used
                                </Button>
                              )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="mobile-card-list md:hidden space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : redemptions.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No redemptions yet</div>
              ) : (
                redemptions.map((redemption) => {
                  const status = getRedemptionStatus(redemption);
                  const StatusIcon = status.icon;
                  return (
                    <div key={redemption.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">
                            {profileNames[redemption.user_id] || "Unknown"}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {redemption.rewards?.name || "Unknown Reward"}
                          </p>
                        </div>
                        <Badge variant={status.variant} className="flex items-center gap-1 shrink-0 text-[10px]">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <code className="bg-muted px-2 py-0.5 rounded text-[11px] font-mono">
                          {redemption.redemption_code}
                        </code>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {redemption.points_spent.toLocaleString()} pts
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Expires: {format(new Date(redemption.expires_at), "dd MMM yyyy")}
                        {redemption.used_at && ` • Used: ${format(new Date(redemption.used_at), "dd MMM")}`}
                      </p>
                      {redemption.status === "active" && new Date(redemption.expires_at) >= new Date() && (
                        <div className="flex items-center justify-end pt-2 border-t border-border/60">
                          <Button variant="outline" size="sm" onClick={() => markRedemptionUsed(redemption.id)} className="h-8 px-2 text-xs">
                            <CheckCircle className="h-3.5 w-3.5 mr-1 text-primary" /> Mark Used
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RewardsManager;
