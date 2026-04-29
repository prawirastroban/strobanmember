import { useState, useEffect } from "react";
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
  Search, RefreshCw, Eye, Car, Pencil, Plus, CalendarCheck, MoreHorizontal,
  UserCheck, KeyRound, UserX, ShieldCheck, Shield, User as UserIcon, Loader2, Mail, Phone,
} from "lucide-react";
import EditCustomerDialog from "./EditCustomerDialog";
import AddVehicleDialog from "./AddVehicleDialog";
import QuickBookingDialog from "./QuickBookingDialog";

type AppRole = "admin" | "staff" | "admin_cabang" | "customer";
const BRANCHES = ["Bandung", "Tasikmalaya", "Cirebon", "Yogyakarta"];

interface CustomerRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  customer_id: string | null;
  email: string;
  vehicle_count: number;
  is_verified: boolean;
  role: AppRole;
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
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isStaff, isAdmin } = useUserRole();

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
        supabase.from("profiles").select("id, full_name, phone, customer_id, is_verified"),
        supabase.from("vehicles").select("user_id"),
        supabase.from("bookings").select("user_id, customer_email"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const emailMap = new Map<string, string>();
      bookingsRes.data?.forEach((b) => {
        if (!emailMap.has(b.user_id)) emailMap.set(b.user_id, b.customer_email);
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
        role: roleMap.get(p.id) || "customer",
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
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", roleChangeDialog.id);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: roleChangeDialog.id, role: newRole as any });
      if (insertError) throw insertError;

      // Sync assigned_branch on the user's profile
      const { error: branchError } = await supabase
        .from("profiles")
        .update({ assigned_branch: newRole === "admin_cabang" ? newBranch : null })
        .eq("id", roleChangeDialog.id);
      if (branchError) throw branchError;

      toast({ title: "Berhasil", description: `Role diubah ke ${ROLE_META[newRole].label}` });
      setCustomers((prev) => prev.map((c) => c.id === roleChangeDialog.id ? { ...c, role: newRole } : c));
      setRoleChangeDialog(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    }
    setIsChangingRole(false);
  };

  const filtered = customers.filter((c) => {
    const matchesSearch =
      (c.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_id?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (c.phone?.toLowerCase().includes(search.toLowerCase()) ?? false);

    if (filter === "with_vehicle") return matchesSearch && c.vehicle_count > 0;
    if (filter === "no_vehicle") return matchesSearch && c.vehicle_count === 0;
    if (filter === "unverified") return matchesSearch && !c.is_verified;
    if (filter === "verified") return matchesSearch && c.is_verified;
    if (filter === "staff") return matchesSearch && (c.role === "staff" || c.role === "admin");
    return matchesSearch;
  });

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

        {isStaff && (
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
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, ID, telepon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Customer</SelectItem>
                <SelectItem value="unverified">Belum Verifikasi</SelectItem>
                <SelectItem value="verified">Sudah Verifikasi</SelectItem>
                <SelectItem value="with_vehicle">Punya Kendaraan</SelectItem>
                <SelectItem value="no_vehicle">Tanpa Kendaraan</SelectItem>
                <SelectItem value="staff">Staff & Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchCustomers} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
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
                          <p className="text-xs text-muted-foreground">{c.phone || "—"}</p>
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
      <Dialog open={!!roleChangeDialog} onOpenChange={(open) => !open && setRoleChangeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Role</DialogTitle>
            <DialogDescription>
              Ubah role untuk <strong>{roleChangeDialog?.full_name || "user"}</strong>. Role saat ini: <Badge variant={ROLE_META[roleChangeDialog?.role || "customer"].variant}>{ROLE_META[roleChangeDialog?.role || "customer"].label}</Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeDialog(null)}>Batal</Button>
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
