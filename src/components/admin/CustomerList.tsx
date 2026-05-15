import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  RefreshCw, Eye, Car, Pencil, Plus, CalendarCheck, MoreHorizontal,
  UserCheck, KeyRound, UserX, ShieldCheck, Shield, User as UserIcon, Loader2, Mail, Phone,
} from "lucide-react";
import EditCustomerDialog from "./EditCustomerDialog";
import AddVehicleDialog from "./AddVehicleDialog";
import QuickBookingDialog from "./QuickBookingDialog";
import FilterBar from "./filters/FilterBar";
import { DEFAULT_TIMELINE, TimelineValue } from "@/utils/timelineFilter";
import { useBranches } from "@/hooks/useBranches";
import { useOnlineUsers } from "@/hooks/usePresence";

type AppRole = "admin" | "staff" | "admin_cabang" | "customer";

interface CustomerRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  customer_id: string | null;
  email: string;
  vehicle_count: number;
  is_verified: boolean;
  phone_verified: boolean;
  role: AppRole;
  created_at?: string;
}

const ROLE_META: Record<AppRole, { label: string; icon: typeof Shield; variant: "default" | "secondary" | "destructive" }> = {
  staff: { label: "Staff (Owner)", icon: Shield, variant: "destructive" },
  admin: { label: "CS Pusat", icon: ShieldCheck, variant: "default" },
  admin_cabang: { label: "Admin Cabang", icon: ShieldCheck, variant: "default" },
  customer: { label: "Customer", icon: UserIcon, variant: "secondary" },
};

const CustomerList = () => {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole | "staff_or_admin">("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [timeline, setTimeline] = useState<TimelineValue>({ preset: "this_year" });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isStaff, isAdmin, isAdminCabang } = useUserRole();
  const { branches } = useBranches();

  // Dialog states
  const [editCustomer, setEditCustomer] = useState<CustomerRow | null>(null);
  const [addVehicleCustomerId, setAddVehicleCustomerId] = useState<string | null>(null);
  const [bookingCustomer, setBookingCustomer] = useState<CustomerRow | null>(null);
  const [verifyConfirm, setVerifyConfirm] = useState<CustomerRow | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<CustomerRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CustomerRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [roleChangeDialog, setRoleChangeDialog] = useState<CustomerRow | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("customer");
  const [newBranch, setNewBranch] = useState<string>("");
  const [isChangingRole, setIsChangingRole] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const [profilesRes, vehiclesRes, bookingsRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone, customer_id, is_verified, phone_verified, created_at, assigned_branch"),
        supabase.from("vehicles").select("user_id"),
        supabase.from("bookings").select("user_id, customer_email"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const emailMap = new Map<string, string>();
      // Primary source: auth.users (covers users registered via email even without bookings)
      try {
        const { data: emailsRes } = await supabase.functions.invoke("admin-user-ops", {
          body: { action: "list_emails" },
        });
        const emails = (emailsRes as any)?.emails as Record<string, string> | undefined;
        if (emails) {
          Object.entries(emails).forEach(([uid, em]) => emailMap.set(uid, em));
        }
      } catch (_e) {
        // Non-fatal — fall back to booking emails only
      }
      // Fallback: bookings (covers cases where auth lookup missed)
      bookingsRes.data?.forEach((b) => {
        if (!emailMap.has(b.user_id) && b.customer_email) emailMap.set(b.user_id, b.customer_email);
      });

      const vehicleCountMap = new Map<string, number>();
      vehiclesRes.data?.forEach((v) => {
        vehicleCountMap.set(v.user_id, (vehicleCountMap.get(v.user_id) || 0) + 1);
      });

      const roleMap = new Map<string, AppRole>();
      rolesRes.data?.forEach((r) => {
        // Priority: staff > admin > admin_cabang > customer
        const existing = roleMap.get(r.user_id);
        const role = r.role as AppRole;
        const rank: Record<AppRole, number> = { staff: 4, admin: 3, admin_cabang: 2, customer: 1 };
        if (!existing || rank[role] > rank[existing]) {
          roleMap.set(r.user_id, role);
        }
      });

      const rows: CustomerRow[] = (profilesRes.data || []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        customer_id: p.customer_id,
        email: emailMap.get(p.id) || "—",
        vehicle_count: vehicleCountMap.get(p.id) || 0,
        is_verified: p.is_verified,
        phone_verified: (p as any).phone_verified ?? false,
        role: roleMap.get(p.id) || "customer",
        created_at: (p as any).created_at,
      }));

      setCustomers(rows);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel("customer-list-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchCustomers)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, fetchCustomers)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Debounce search 350ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const dateRange = useMemo(() => {
    // Inline date range using timeline util
    return null;
  }, []);

  const handleVerify = async (customer: CustomerRow) => {
    setVerifyingId(customer.id);
    const { data, error } = await supabase.functions.invoke("admin-user-ops", {
      body: { action: "verify_user", userId: customer.id },
    });
    if (error || !(data as any)?.success) {
      toast({ variant: "destructive", title: "Gagal", description: error?.message || (data as any)?.error || "Unknown error" });
    } else {
      toast({ title: "✅ Berhasil", description: "User berhasil diverifikasi" });
      setCustomers((prev) => prev.map((c) => c.id === customer.id ? { ...c, is_verified: true } : c));
    }
    setVerifyingId(null);
    setVerifyConfirm(null);
  };

  const handleResetPassword = async () => {
    if (!passwordDialog) return;
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "Password minimal 6 karakter" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "Password tidak cocok" });
      return;
    }
    setIsResetting(true);
    try {
      const res = await supabase.functions.invoke("admin-user-ops", {
        body: { action: "reset_password", userId: passwordDialog.id, newPassword },
      });
      if (res.error) throw res.error;
      if ((res.data as any)?.error) throw new Error((res.data as any).error);
      toast({ title: "Berhasil", description: "Password user berhasil diubah" });
      setPasswordDialog(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    }
    setIsResetting(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const res = await supabase.functions.invoke("admin-user-ops", {
        body: { action: "delete_user", userId: deleteConfirm.id },
      });
      if (res.error) throw res.error;
      if ((res.data as any)?.error) throw new Error((res.data as any).error);
      toast({ title: "Berhasil", description: "User berhasil dihapus" });
      setCustomers((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    }
    setIsDeleting(false);
  };

  const handleChangeRole = async () => {
    if (!roleChangeDialog) return;
    if (newRole === "admin_cabang" && !newBranch) {
      toast({ variant: "destructive", title: "Cabang wajib dipilih untuk Admin Cabang" });
      return;
    }
    setIsChangingRole(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-ops", {
        body: {
          action: "set_role",
          userId: roleChangeDialog.id,
          role: newRole === "customer" ? "customer" : newRole,
          assignedBranch: newRole === "admin_cabang" ? newBranch : null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({ title: "Berhasil", description: `Role diubah ke ${ROLE_META[newRole].label}` });
      setCustomers((prev) => prev.map((c) => c.id === roleChangeDialog.id ? { ...c, role: newRole } : c));
      setRoleChangeDialog(null);
      setNewBranch("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    }
    setIsChangingRole(false);
  };

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    // Compute date range from timeline
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    let startStr: string | null = null;
    let endStr: string | null = null;
    {
      // lazy import to avoid top-level changes; replicate getDateRange inline minimal
      const t = timeline;
      const startOf = (d: Date, u: "day" | "week" | "month" | "quarter" | "year") => {
        const r = new Date(d);
        if (u === "day") r.setHours(0, 0, 0, 0);
        if (u === "week") {
          const day = r.getDay(); const diff = day === 0 ? -6 : 1 - day;
          r.setDate(r.getDate() + diff); r.setHours(0, 0, 0, 0);
        }
        if (u === "month") { r.setDate(1); r.setHours(0, 0, 0, 0); }
        if (u === "quarter") { r.setMonth(Math.floor(r.getMonth() / 3) * 3, 1); r.setHours(0, 0, 0, 0); }
        if (u === "year") { r.setMonth(0, 1); r.setHours(0, 0, 0, 0); }
        return r;
      };
      switch (t.preset) {
        case "today": startStr = fmt(startOf(now, "day")); endStr = fmt(now); break;
        case "yesterday": { const y = new Date(now); y.setDate(now.getDate() - 1); startStr = fmt(startOf(y, "day")); endStr = fmt(y); break; }
        case "this_week": startStr = fmt(startOf(now, "week")); endStr = fmt(now); break;
        case "last_week": { const lws = startOf(now, "week"); lws.setDate(lws.getDate() - 7); const lwe = new Date(lws); lwe.setDate(lws.getDate() + 6); startStr = fmt(lws); endStr = fmt(lwe); break; }
        case "this_month": startStr = fmt(startOf(now, "month")); endStr = fmt(now); break;
        case "last_month": { const lms = new Date(now.getFullYear(), now.getMonth() - 1, 1); const lme = new Date(now.getFullYear(), now.getMonth(), 0); startStr = fmt(lms); endStr = fmt(lme); break; }
        case "this_quarter": startStr = fmt(startOf(now, "quarter")); endStr = fmt(now); break;
        case "this_year": startStr = fmt(startOf(now, "year")); endStr = fmt(now); break;
        case "custom": startStr = t.startDate ?? null; endStr = t.endDate ?? null; break;
      }
    }
    return customers.filter((c) => {
      // Search
      const matchesSearch =
        !q ||
        (c.full_name?.toLowerCase().includes(q) ?? false) ||
        c.email.toLowerCase().includes(q) ||
        (c.customer_id?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.toLowerCase().includes(q) ?? false);
      if (!matchesSearch) return false;

      // Legacy verified/vehicle/staff filter (kept for backward compat)
      if (filter === "with_vehicle" && c.vehicle_count <= 0) return false;
      if (filter === "no_vehicle" && c.vehicle_count !== 0) return false;
      if (filter === "unverified" && c.is_verified) return false;
      if (filter === "verified" && !c.is_verified) return false;

      // Role chip
      if (roleFilter !== "all") {
        if (roleFilter === "staff_or_admin") {
          if (!(c.role === "staff" || c.role === "admin")) return false;
        } else if (c.role !== roleFilter) return false;
      }

      // Timeline by created_at (skip if missing)
      if (c.created_at && startStr && endStr) {
        const created = c.created_at.slice(0, 10);
        if (created < startStr || created > endStr) return false;
      }

      return true;
    });
  }, [customers, debouncedSearch, filter, roleFilter, timeline]);

  const unverifiedCount = customers.filter((c) => !c.is_verified).length;

  // Reusable action menu (used by both desktop table & mobile cards)
  const renderActionMenu = (c: CustomerRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Lihat</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigate(`/dashboard/customers/${c.id}`)}>
          <Eye className="h-4 w-4 mr-2" /> Detail Customer
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/dashboard/customers/${c.id}`)}>
          <Car className="h-4 w-4 mr-2" /> Lihat Kendaraan
        </DropdownMenuItem>

        {(isStaff || isAdmin || isAdminCabang) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Aksi Cepat</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setEditCustomer(c)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit Customer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddVehicleCustomerId(c.id)}>
              <Plus className="h-4 w-4 mr-2" /> Tambah Kendaraan
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBookingCustomer(c)}>
              <CalendarCheck className="h-4 w-4 mr-2" /> Buat Booking
            </DropdownMenuItem>
          </>
        )}

        {isStaff && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Manajemen Akun</DropdownMenuLabel>
            {!c.is_verified && (
              <DropdownMenuItem
                onClick={() => setVerifyConfirm(c)}
                disabled={verifyingId === c.id}
              >
                {verifyingId === c.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                Verifikasi User
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                setNewRole(c.role);
                setRoleChangeDialog(c);
              }}
            >
              <Shield className="h-4 w-4 mr-2" /> Ubah Role
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPasswordDialog(c)}>
              <KeyRound className="h-4 w-4 mr-2" /> Reset Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteConfirm(c)}
              className="text-destructive focus:text-destructive"
            >
              <UserX className="h-4 w-4 mr-2" /> Hapus Akun
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Customer Management</CardTitle>
              <CardDescription>
                Customers, vehicles, verification & roles • {customers.length} total
                {unverifiedCount > 0 && ` • ${unverifiedCount} unverified`}
              </CardDescription>
            </div>
            <Badge variant={isStaff ? "default" : "secondary"} className="gap-1">
              {isStaff ? <Shield className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {isStaff ? "Staff (Full Access)" : "Admin (Read-Only)"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <FilterBar
            search={{
              placeholder: "Cari nama, email, ID, telepon...",
              value: search,
              onChange: setSearch,
            }}
            timeline={{ value: timeline, onChange: setTimeline, label: "Bergabung" }}
            chips={[
              { key: "all", label: "Semua Role", value: "all", active: roleFilter === "all", onClick: () => setRoleFilter("all") },
              { key: "customer", label: "Customer", value: "customer", active: roleFilter === "customer", onClick: () => setRoleFilter("customer") },
              { key: "admin", label: "CS Pusat", value: "admin", active: roleFilter === "admin", onClick: () => setRoleFilter("admin") },
              { key: "admin_cabang", label: "Admin Cabang", value: "admin_cabang", active: roleFilter === "admin_cabang", onClick: () => setRoleFilter("admin_cabang") },
              { key: "staff", label: "Staff", value: "staff", active: roleFilter === "staff", onClick: () => setRoleFilter("staff") },
            ]}
            dropdowns={[
              {
                key: "verif", label: "Verifikasi", value: filter, onChange: setFilter,
                options: [
                  { label: "Semua", value: "all" },
                  { label: "Terverifikasi", value: "verified" },
                  { label: "Belum Verif", value: "unverified" },
                  { label: "Punya Kendaraan", value: "with_vehicle" },
                  { label: "Tanpa Kendaraan", value: "no_vehicle" },
                ],
              },
            ]}
            resultCount={filtered.length}
            onReset={() => {
              setSearch(""); setFilter("all"); setRoleFilter("all");
              setBranchFilter("all"); setTimeline({ preset: "this_year" });
            }}
          />
          <div className="flex justify-end mb-3">
            <Button variant="outline" size="sm" onClick={fetchCustomers} disabled={isLoading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {/* Desktop / Tablet: Table */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Kendaraan</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Verifikasi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Tidak ada customer ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => {
                    const RoleIcon = ROLE_META[c.role].icon;
                    return (
                      <TableRow key={c.id} className={!c.is_verified ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">
                          {c.full_name || "—"}
                          {c.customer_id && (
                            <p className="text-xs text-muted-foreground font-mono">{c.customer_id}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{c.email}</p>
                          {c.phone ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-xs text-muted-foreground">{c.phone}</p>
                              {c.phone_verified ? (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30 gap-1 px-1.5 py-0 text-[10px] h-4">
                                  <UserCheck className="h-2.5 w-2.5" /> Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-destructive/40 text-destructive gap-1 px-1.5 py-0 text-[10px] h-4">
                                  Unverified
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">—</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            {c.vehicle_count}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ROLE_META[c.role].variant} className="gap-1">
                            <RoleIcon className="h-3 w-3" />
                            {ROLE_META[c.role].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.is_verified ? (
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30 gap-1">
                              <UserCheck className="h-3 w-3" /> Verified
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="animate-pulse">
                              Unverified
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {renderActionMenu(c)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Card list */}
          <div className="md:hidden space-y-2">
            {isLoading ? (
              <div className="py-10 flex justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">
                Tidak ada customer ditemukan
              </p>
            ) : (
              filtered.map((c) => {
                const RoleIcon = ROLE_META[c.role].icon;
                return (
                  <div
                    key={c.id}
                    className={`rounded-lg border p-3 ${!c.is_verified ? "bg-destructive/5 border-destructive/20" : "bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{c.full_name || "—"}</p>
                        {c.customer_id && (
                          <p className="text-[11px] text-muted-foreground font-mono truncate">{c.customer_id}</p>
                        )}
                      </div>
                      <div className="shrink-0 -mr-2 -mt-1">
                        {renderActionMenu(c)}
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.phone || "—"}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <Badge variant={ROLE_META[c.role].variant} className="gap-1 text-[10px] py-0 h-5">
                        <RoleIcon className="h-3 w-3" />
                        {ROLE_META[c.role].label}
                      </Badge>
                      {c.is_verified ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30 gap-1 text-[10px] py-0 h-5">
                          <UserCheck className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] py-0 h-5">
                          Unverified
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1 text-[10px] py-0 h-5">
                        <Car className="h-3 w-3" />
                        {c.vehicle_count} kendaraan
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <EditCustomerDialog
        open={!!editCustomer}
        onOpenChange={(open) => !open && setEditCustomer(null)}
        customer={editCustomer}
        onSaved={fetchCustomers}
      />

      {/* Add Vehicle Dialog */}
      {addVehicleCustomerId && (
        <AddVehicleDialog
          open={!!addVehicleCustomerId}
          onOpenChange={(open) => !open && setAddVehicleCustomerId(null)}
          customerId={addVehicleCustomerId}
          onSaved={fetchCustomers}
        />
      )}

      {/* Quick Booking Dialog */}
      {bookingCustomer && (
        <QuickBookingDialog
          open={!!bookingCustomer}
          onOpenChange={(open) => !open && setBookingCustomer(null)}
          customerId={bookingCustomer.id}
          customerName={bookingCustomer.full_name || "Customer"}
          customerEmail={bookingCustomer.email}
          customerPhone={bookingCustomer.phone || ""}
          onAddVehicle={() => {
            setBookingCustomer(null);
            setAddVehicleCustomerId(bookingCustomer.id);
          }}
        />
      )}

      {/* Verify Confirm */}
      <AlertDialog open={!!verifyConfirm} onOpenChange={(open) => !open && setVerifyConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verifikasi User</AlertDialogTitle>
            <AlertDialogDescription>
              Verifikasi akun <strong>{verifyConfirm?.full_name || "user ini"}</strong>? User akan dapat melakukan booking setelah diverifikasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => verifyConfirm && handleVerify(verifyConfirm)}>
              Ya, Verifikasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password */}
      <Dialog
        open={!!passwordDialog}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordDialog(null);
            setNewPassword("");
            setConfirmPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Ubah password untuk <strong>{passwordDialog?.full_name || "user"}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <PasswordInput placeholder="Password baru (min. 6 karakter)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <PasswordInput placeholder="Konfirmasi password baru" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPasswordDialog(null); setNewPassword(""); setConfirmPassword(""); }}>Batal</Button>
            <Button onClick={handleResetPassword} disabled={isResetting || !newPassword}>
              {isResetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role */}
      <Dialog open={!!roleChangeDialog} onOpenChange={(open) => { if (!open) { setRoleChangeDialog(null); setNewBranch(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Role</DialogTitle>
            <DialogDescription>
              Ubah role untuk <strong>{roleChangeDialog?.full_name || "user"}</strong>. Role saat ini: <Badge variant={ROLE_META[roleChangeDialog?.role || "customer"].variant}>{ROLE_META[roleChangeDialog?.role || "customer"].label}</Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_META) as AppRole[]).map((r) => {
                  const Icon = ROLE_META[r].icon;
                  return (
                    <SelectItem key={r} value={r}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {ROLE_META[r].label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {newRole === "admin_cabang" && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Cabang Penempatan <span className="text-destructive">*</span></p>
                <Select value={newBranch} onValueChange={setNewBranch}>
                  <SelectTrigger><SelectValue placeholder="Pilih cabang" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Admin Cabang hanya bisa melihat & mengelola booking, transaksi, dan pembayaran pada cabang yang dipilih.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRoleChangeDialog(null); setNewBranch(""); }}>Batal</Button>
            <Button onClick={handleChangeRole} disabled={isChangingRole || newRole === roleChangeDialog?.role}>
              {isChangingRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              Simpan Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus akun <strong>{deleteConfirm?.full_name || "user"}</strong>? Semua data user termasuk booking, kendaraan, poin loyalti, dan role akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserX className="h-4 w-4 mr-2" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CustomerList;
