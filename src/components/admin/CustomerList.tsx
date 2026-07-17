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
import FilterBarV2, { type QuickChip, type ActiveChip } from "./filters/FilterBarV2";
import { useFilterPresets } from "@/hooks/useFilterPresets";
import { DEFAULT_TIMELINE, TimelineValue } from "@/utils/timelineFilter";
import { useBranches } from "@/hooks/useBranches";
import { useOnlineUsers } from "@/hooks/usePresence";
import { invokeAdminUserOps } from "@/lib/adminUserOps";

type AppRole = "admin" | "staff" | "admin_cabang" | "mekanik" | "customer";
const isBranchScopedRole = (role: AppRole) =>
  role === "admin_cabang" || role === "mekanik";
const normalizeRole = (role: unknown): AppRole => {
  if (role === "head_mekanik") return "mekanik";
  if (role === "staff" || role === "admin" || role === "admin_cabang" || role === "mekanik") return role;
  return "customer";
};

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
  assigned_branch: string | null;
}

const ROLE_META: Record<AppRole, { label: string; icon: typeof Shield; variant: "default" | "secondary" | "destructive" }> = {
  staff: { label: "Staff (Owner)", icon: Shield, variant: "destructive" },
  admin: { label: "CS Pusat", icon: ShieldCheck, variant: "default" },
  admin_cabang: { label: "Admin Cabang", icon: ShieldCheck, variant: "default" },
  mekanik: { label: "Mekanik Cabang", icon: ShieldCheck, variant: "default" },
  customer: { label: "Customer", icon: UserIcon, variant: "secondary" },
};

const CustomerList = () => {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const onlineUsers = useOnlineUsers();
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [phoneVerifFilter, setPhoneVerifFilter] = useState<"all" | "verified" | "unverified">("all");
  const [presenceFilter, setPresenceFilter] = useState<"all" | "online" | "offline">("all");
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
  const [isResetting, setIsResetting] = useState<"whatsapp" | "email" | null>(null);
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
        const emailsRes = await invokeAdminUserOps<any>({ action: "list_emails" });
        const emails = emailsRes?.emails as Record<string, string> | undefined;
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
        const role = normalizeRole(r.role);
        const rank: Record<AppRole, number> = { staff: 6, admin: 5, admin_cabang: 4, mekanik: 2, customer: 1 };
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
        assigned_branch: (p as any).assigned_branch ?? null,
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
    try {
      await invokeAdminUserOps({ action: "verify_user", userId: customer.id });
      toast({ title: "✅ Berhasil", description: "User berhasil diverifikasi" });
      setCustomers((prev) => prev.map((c) => c.id === customer.id ? { ...c, is_verified: true } : c));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message || "Unknown error" });
    }
    setVerifyingId(null);
    setVerifyConfirm(null);
  };

  const handleSendResetOtp = async (channel: "whatsapp" | "email") => {
    if (!passwordDialog) return;
    setIsResetting(channel);
    try {
      const data = await invokeAdminUserOps<any>({ action: "trigger_password_reset_otp", userId: passwordDialog.id, channel });
      toast({
        title: "OTP terkirim",
        description:
          channel === "whatsapp"
            ? `Kode OTP + link reset password dikirim via WhatsApp ke ${data?.masked || "nomor user"}.`
            : `Email reset password dikirim ke ${data?.masked || "email user"}.`,
      });
      setPasswordDialog(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    }
    setIsResetting(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await invokeAdminUserOps({ action: "delete_user", userId: deleteConfirm.id });
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
    if (isBranchScopedRole(newRole) && !newBranch) {
      toast({ variant: "destructive", title: "Cabang wajib dipilih untuk role cabang" });
      return;
    }
    setIsChangingRole(true);
    try {
      await invokeAdminUserOps({
        action: "set_role",
        userId: roleChangeDialog.id,
        role: newRole,
        assignedBranch: isBranchScopedRole(newRole) ? newBranch : null,
      });

      toast({ title: "Berhasil", description: `Role diubah ke ${ROLE_META[newRole].label}` });
      setCustomers((prev) => prev.map((c) =>
        c.id === roleChangeDialog.id
          ? { ...c, role: newRole, assigned_branch: isBranchScopedRole(newRole) ? newBranch : null }
          : c
      ));
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

      // Phone WA verification
      if (phoneVerifFilter === "verified" && !c.phone_verified) return false;
      if (phoneVerifFilter === "unverified" && c.phone_verified) return false;

      // Live presence (online/offline)
      if (presenceFilter === "online" && !onlineUsers.has(c.id)) return false;
      if (presenceFilter === "offline" && onlineUsers.has(c.id)) return false;

      // Role chip
      if (roleFilter !== "all") {
        if (roleFilter === "staff_or_admin") {
          if (!(c.role === "staff" || c.role === "admin")) return false;
        } else if (c.role !== roleFilter) return false;
      }

      // Branch filter (only meaningful for branch-scoped operational roles)
      if (branchFilter !== "all") {
        if (!isBranchScopedRole(c.role)) return false;
        if (c.assigned_branch !== branchFilter) return false;
      }

      // Timeline by created_at (skip if missing)
      if (c.created_at && startStr && endStr) {
        const created = c.created_at.slice(0, 10);
        if (created < startStr || created > endStr) return false;
      }

      return true;
    });
  }, [customers, debouncedSearch, filter, phoneVerifFilter, presenceFilter, roleFilter, branchFilter, timeline, onlineUsers]);

  const branchNameMap = useMemo(() => {
    const m = new Map<string, string>();
    branches.forEach((b) => m.set(b.slug, b.name));
    return m;
  }, [branches]);

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

        {(isStaff || isAdmin) && !c.is_verified && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Verifikasi</DropdownMenuLabel>
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
          </>
        )}

        {isStaff && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Manajemen Akun</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                setNewRole(c.role);
                setNewBranch(c.assigned_branch || "");
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
              {isStaff ? (
                <Shield className="h-3 w-3" />
              ) : isAdmin ? (
                <UserCheck className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              {isStaff
                ? "Staff (Full Access)"
                : isAdmin
                  ? "CS Pusat (Verifikasi & Edit)"
                  : "Admin (Read-Only)"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const resetAll = () => {
              setSearch(""); setFilter("all"); setPhoneVerifFilter("all"); setPresenceFilter("all");
              setRoleFilter("all"); setBranchFilter("all"); setTimeline({ preset: "this_year" });
            };
            const quickChips: QuickChip[] = [
              { key: "all", label: "Semua", active: roleFilter === "all" && filter === "all", onClick: resetAll },
              { key: "unverified", label: "⚠️ Belum Verif", active: filter === "unverified", onClick: () => setFilter(filter === "unverified" ? "all" : "unverified"), count: unverifiedCount },
              { key: "online", label: "🟢 Online", active: presenceFilter === "online", onClick: () => setPresenceFilter(presenceFilter === "online" ? "all" : "online") },
              { key: "with_vehicle", label: "🚗 Punya Kendaraan", active: filter === "with_vehicle", onClick: () => setFilter(filter === "with_vehicle" ? "all" : "with_vehicle") },
              { key: "customer", label: "Customer", active: roleFilter === "customer", onClick: () => setRoleFilter(roleFilter === "customer" ? "all" : "customer") },
              { key: "staff", label: "Staff", active: roleFilter === "staff", onClick: () => setRoleFilter(roleFilter === "staff" ? "all" : "staff") },
            ];
            const activeChips: ActiveChip[] = [];
            if (filter !== "all") activeChips.push({ key: "f", label: `Verifikasi: ${filter}`, onRemove: () => setFilter("all") });
            if (phoneVerifFilter !== "all") activeChips.push({ key: "wa", label: `WA: ${phoneVerifFilter}`, onRemove: () => setPhoneVerifFilter("all") });
            if (presenceFilter !== "all") activeChips.push({ key: "p", label: `Presence: ${presenceFilter}`, onRemove: () => setPresenceFilter("all") });
            if (roleFilter !== "all") activeChips.push({ key: "r", label: `Role: ${roleFilter}`, onRemove: () => setRoleFilter("all") });
            if (branchFilter !== "all") activeChips.push({ key: "b", label: `Cabang: ${branchNameMap.get(branchFilter) || branchFilter}`, onRemove: () => setBranchFilter("all") });
            const isActive = activeChips.length > 0 || !!debouncedSearch || timeline.preset !== "this_year";
            return (
              <FilterBarV2
                search={{ placeholder: "Cari nama, email, ID, telepon...", value: search, onChange: setSearch }}
                quickChips={quickChips}
                activeChips={activeChips}
                resultCount={filtered.length}
                isActive={isActive}
                onReset={resetAll}
                exportButton={
                  <Button variant="outline" size="sm" onClick={fetchCustomers} disabled={isLoading} className="gap-2 h-9">
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
                  </Button>
                }
                advanced={{
                  badge: activeChips.length,
                  timeline: { value: timeline, onChange: setTimeline },
                  dropdowns: [
                    { key: "verif", label: "Verifikasi", value: filter, onChange: setFilter, options: [
                      { label: "Semua", value: "all" },
                      { label: "Terverifikasi", value: "verified" },
                      { label: "Belum Verif", value: "unverified" },
                      { label: "Punya Kendaraan", value: "with_vehicle" },
                      { label: "Tanpa Kendaraan", value: "no_vehicle" },
                    ]},
                    { key: "wa", label: "Verifikasi WA", value: phoneVerifFilter, onChange: (v) => setPhoneVerifFilter(v as any), options: [
                      { label: "Semua", value: "all" }, { label: "Terverifikasi", value: "verified" }, { label: "Belum Verif", value: "unverified" },
                    ]},
                    { key: "presence", label: "Status Online", value: presenceFilter, onChange: (v) => setPresenceFilter(v as any), options: [
                      { label: "Semua", value: "all" }, { label: "Online", value: "online" }, { label: "Offline", value: "offline" },
                    ]},
                    { key: "role", label: "Role", value: roleFilter, onChange: (v) => setRoleFilter(v as any), options: [
                      { label: "Semua", value: "all" }, { label: "Customer", value: "customer" }, { label: "CS Pusat", value: "admin" }, { label: "Admin Cabang", value: "admin_cabang" }, { label: "Mekanik Cabang", value: "mekanik" }, { label: "Staff", value: "staff" },
                    ]},
                    ...(branches.length > 0 ? [{
                      key: "branch", label: "Cabang", value: branchFilter, onChange: setBranchFilter,
                      disabled: roleFilter !== "all" && roleFilter !== "admin_cabang" && roleFilter !== "mekanik",
                      options: [{ label: "Semua", value: "all" }, ...branches.map((b) => ({ label: b.name, value: b.slug }))],
                    }] : []),
                  ],
                }}
              />
            );
          })()}

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
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                                onlineUsers.has(c.id)
                                  ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse"
                                  : "bg-muted-foreground/40"
                              }`}
                              title={onlineUsers.has(c.id) ? "Online" : "Offline"}
                              aria-label={onlineUsers.has(c.id) ? "Online" : "Offline"}
                            />
                            <span>{c.full_name || "—"}</span>
                          </div>
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
                          <div className="flex flex-col gap-0.5 items-start">
                            <Badge variant={ROLE_META[c.role].variant} className="gap-1">
                              <RoleIcon className="h-3 w-3" />
                              {ROLE_META[c.role].label}
                            </Badge>
                            {isBranchScopedRole(c.role) && (
                              <span className={`text-[10px] font-medium ${c.assigned_branch ? "text-muted-foreground" : "text-destructive"}`}>
                                {c.assigned_branch
                                  ? `• ${branchNameMap.get(c.assigned_branch) || c.assigned_branch}`
                                  : "• Belum diset"}
                              </span>
                            )}
                          </div>
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
                      {isBranchScopedRole(c.role) && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 h-5 ${c.assigned_branch ? "" : "border-destructive/40 text-destructive"}`}
                        >
                          {c.assigned_branch
                            ? branchNameMap.get(c.assigned_branch) || c.assigned_branch
                            : "Cabang belum diset"}
                        </Badge>
                      )}
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
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim OTP Reset Password</DialogTitle>
            <DialogDescription>
              Pilih kanal untuk mengirim OTP + link reset password ke <strong>{passwordDialog?.full_name || "user"}</strong>.
              User akan mengatur password baru sendiri lewat link tersebut.
            </DialogDescription>
          </DialogHeader>
          {passwordDialog && (() => {
            const hasEmail =
              !!passwordDialog.email &&
              !passwordDialog.email.endsWith("@phone.local") &&
              !passwordDialog.email.endsWith("@phone.bengkelstroban.com");
            const hasPhone = !!passwordDialog.phone;
            return (
              <div className="space-y-3 py-2">
                <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={hasEmail ? "" : "text-muted-foreground italic"}>
                      {hasEmail ? passwordDialog.email : "Tidak ada email valid"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={hasPhone ? "" : "text-muted-foreground italic"}>
                      {hasPhone ? passwordDialog.phone : "Tidak ada nomor WhatsApp"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => handleSendResetOtp("whatsapp")}
                    disabled={!hasPhone || !!isResetting}
                  >
                    {isResetting === "whatsapp"
                      ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      : <Phone className="h-4 w-4 mr-2" />}
                    Kirim via WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSendResetOtp("email")}
                    disabled={!hasEmail || !!isResetting}
                  >
                    {isResetting === "email"
                      ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      : <Mail className="h-4 w-4 mr-2" />}
                    Kirim via Email
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Demi keamanan, admin tidak lagi bisa mengetik password user secara manual.
                  Pesan reset bersifat sekali pakai dan kedaluwarsa otomatis.
                </p>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPasswordDialog(null)} disabled={!!isResetting}>
              Tutup
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
              Ubah role untuk <strong>{roleChangeDialog?.full_name || "user"}</strong>. Role saat ini: {ROLE_META[roleChangeDialog?.role || "customer"].label}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <Select value={newRole} onValueChange={(v) => { setNewRole(v as AppRole); if (!isBranchScopedRole(v as AppRole)) setNewBranch(""); }}>
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
            {isBranchScopedRole(newRole) && (
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
                  Role cabang hanya bisa melihat & mengelola scope operasional pada cabang yang dipilih.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRoleChangeDialog(null); setNewBranch(""); }}>Batal</Button>
            <Button
              onClick={handleChangeRole}
              disabled={
                isChangingRole ||
                (newRole === roleChangeDialog?.role &&
                  (!isBranchScopedRole(newRole) ||
                    newBranch === (roleChangeDialog?.assigned_branch || "")))
              }
            >
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
