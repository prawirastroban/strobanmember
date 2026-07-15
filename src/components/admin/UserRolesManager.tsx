import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Shield, ShieldCheck, User, KeyRound, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import FilterBarV2, { type QuickChip, type ActiveChip } from "./filters/FilterBarV2";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { invokeAdminUserOps } from "@/lib/adminUserOps";
import { useBranches } from "@/hooks/useBranches";

type AppRole = "admin" | "staff" | "admin_cabang" | "mekanik" | "head_mekanik" | "customer";
const isBranchScopedRole = (role: AppRole) => role === "admin_cabang" || role === "mekanik" || role === "head_mekanik";
const normalizeRole = (role: unknown): AppRole => {
  if (role === "staff" || role === "admin" || role === "admin_cabang" || role === "mekanik" || role === "head_mekanik") return role;
  return "customer";
};

interface UserWithRoles {
  userId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  customerId: string | null;
  roles: AppRole[];
  assignedBranch: string | null;
}

const ROLE_OPTIONS: { value: AppRole; label: string; icon: typeof Shield; color: string }[] = [
  { value: "admin", label: "CS Pusat", icon: ShieldCheck, color: "destructive" },
  { value: "staff", label: "Staff (Owner)", icon: Shield, color: "default" },
  { value: "admin_cabang", label: "Admin Cabang", icon: ShieldCheck, color: "default" },
  { value: "mekanik", label: "Mekanik Cabang", icon: ShieldCheck, color: "default" },
  { value: "head_mekanik", label: "Head Mekanik Cabang", icon: ShieldCheck, color: "default" },
  { value: "customer", label: "Customer", icon: User, color: "secondary" },
];

const UserRolesManager = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  // Per-row pending role selection (avoids cross-row state leaking)
  const [pendingRole, setPendingRole] = useState<Record<string, AppRole>>({});
  const [pendingBranch, setPendingBranch] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const { isStaff, isLoading: roleLoading } = useUserRole();
  const { branches } = useBranches();

  
  // Password reset state
  const [passwordDialog, setPasswordDialog] = useState<{ userId: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Delete user state
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<{ userId: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, customer_id, assigned_branch")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const roleMap: Record<string, AppRole[]> = {};
      allRoles?.forEach((r) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(normalizeRole(r.role));
      });

      const merged: UserWithRoles[] = (profiles || []).map((p) => ({
        userId: p.id,
        email: p.customer_id || p.id.substring(0, 8),
        fullName: p.full_name,
        phone: p.phone,
        customerId: p.customer_id,
        roles: roleMap[p.id] || [],
        assignedBranch: (p as any).assigned_branch ?? null,
      }));

      setUsers(merged);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching users",
        description: error.message,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const setRole = async (userId: string, role: AppRole, assignedBranch?: string | null) => {
    if (isBranchScopedRole(role) && !assignedBranch) {
      toast({ variant: "destructive", title: "Cabang wajib dipilih", description: "Pilih cabang untuk Admin/Mekanik Cabang." });
      return;
    }
    setSavingUserId(userId);
    try {
      await invokeAdminUserOps({ action: "set_role", userId, role, assignedBranch: isBranchScopedRole(role) ? assignedBranch : null });
      toast({ title: "Role diubah", description: `Role berhasil diubah ke ${role}` });
      setUsers((prev) => prev.map((u) => (u.userId === userId ? { ...u, roles: [role], assignedBranch: isBranchScopedRole(role) ? assignedBranch || null : null } : u)));
      setPendingRole((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setPendingBranch((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal mengubah role", description: e?.message || String(e) });
    } finally {
      setSavingUserId(null);
    }
  };


  const handleResetPassword = async () => {
    if (!passwordDialog) return;
    if (newPassword.length < 8) {
      toast({ variant: "destructive", title: "Error", description: "Password minimal 8 karakter" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "Password tidak cocok" });
      return;
    }

    setIsResetting(true);
    try {
      await invokeAdminUserOps({ action: "reset_password", userId: passwordDialog.userId, newPassword });

      toast({ title: "Berhasil", description: "Password user berhasil diubah" });
      setPasswordDialog(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal mengubah password", description: error.message });
    }
    setIsResetting(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserConfirm) return;
    setIsDeleting(true);
    try {
      await invokeAdminUserOps({ action: "delete_user", userId: deleteUserConfirm.userId });

      toast({ title: "Berhasil", description: "User berhasil dihapus" });
      setUsers((prev) => prev.filter((u) => u.userId !== deleteUserConfirm.userId));
      setDeleteUserConfirm(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal menghapus user", description: error.message });
    }
    setIsDeleting(false);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || (
      (u.fullName?.toLowerCase().includes(q) ?? false) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone?.toLowerCase().includes(q) ?? false) ||
      (u.customerId?.toLowerCase().includes(q) ?? false)
    );
    if (!matchSearch) return false;
    if (roleFilter !== "all") {
      const effective = (u.roles[0] || "customer") as AppRole;
      if (effective !== roleFilter) return false;
    }
    return true;
  });

  const roleCount = (role: AppRole) =>
    users.filter((u) => (u.roles[0] || "customer") === role).length;

  const quickChips: QuickChip[] = [
    { key: "customer", label: "👤 Customer", active: roleFilter === "customer", count: roleCount("customer"), onClick: () => setRoleFilter(roleFilter === "customer" ? "all" : "customer") },
    { key: "staff", label: "🛠 Staff", active: roleFilter === "staff", count: roleCount("staff"), onClick: () => setRoleFilter(roleFilter === "staff" ? "all" : "staff") },
    { key: "admin_cabang", label: "🏢 Admin Cabang", active: roleFilter === "admin_cabang", count: roleCount("admin_cabang"), onClick: () => setRoleFilter(roleFilter === "admin_cabang" ? "all" : "admin_cabang") },
    { key: "mekanik", label: "🔧 Mekanik", active: roleFilter === "mekanik", count: roleCount("mekanik"), onClick: () => setRoleFilter(roleFilter === "mekanik" ? "all" : "mekanik") },
    { key: "admin", label: "🛡 Admin", active: roleFilter === "admin", count: roleCount("admin"), onClick: () => setRoleFilter(roleFilter === "admin" ? "all" : "admin") },
  ];
  const activeChips: ActiveChip[] = [];
  if (roleFilter !== "all") {
    const lbl = ROLE_OPTIONS.find((r) => r.value === roleFilter)?.label || roleFilter;
    activeChips.push({ key: "rf", label: `Role: ${lbl}`, onRemove: () => setRoleFilter("all") });
  }
  const isActiveFilter = activeChips.length > 0 || !!searchQuery;
  const resetAll = () => { setRoleFilter("all"); setSearchQuery(""); };

  const getRoleBadgeVariant = (role: AppRole) => {
    const opt = ROLE_OPTIONS.find((r) => r.value === role);
    return (opt?.color || "secondary") as "default" | "secondary" | "destructive" | "outline";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manajemen User & Role</CardTitle>
        <CardDescription>
          Kelola role pengguna, ubah password, atau hapus akun
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!roleLoading && !isStaff && (
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Akun Anda tidak berhak mengubah role</AlertTitle>
            <AlertDescription>
              Hanya akun dengan role <strong>Staff (Owner)</strong> yang boleh mengubah role user lain.
              Login menggunakan akun Owner untuk melakukan perubahan.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <FilterBarV2
              search={{ placeholder: "Cari nama, Customer ID, atau telepon...", value: searchQuery, onChange: setSearchQuery }}
              quickChips={quickChips}
              activeChips={activeChips}
              resultCount={filteredUsers.length}
              isActive={isActiveFilter}
              onReset={resetAll}
            />
          </div>
          <Button variant="outline" onClick={fetchUsers} disabled={isLoading} className="h-9 shrink-0">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Customer ID</TableHead>
                <TableHead>Role Saat Ini</TableHead>
                <TableHead>Ubah Role</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Tidak ada user ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const selectedRole = pendingRole[user.userId];
                  const selectedBranch = pendingBranch[user.userId] ?? user.assignedBranch ?? "";
                  return (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.fullName || "—"}</p>
                        <p className="text-sm text-muted-foreground">{user.phone || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{user.customerId || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.roles[0] || "customer")}>
                        {ROLE_OPTIONS.find((r) => r.value === (user.roles[0] || "customer"))?.label || "Customer"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={selectedRole ?? ""}
                          onValueChange={(val) => {
                            const role = val as AppRole;
                            setPendingRole((prev) => ({ ...prev, [user.userId]: role }));
                            if (!isBranchScopedRole(role)) {
                              setPendingBranch((prev) => {
                                const next = { ...prev };
                                delete next[user.userId];
                                return next;
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Pilih role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                <div className="flex items-center gap-2">
                                  <r.icon className="h-4 w-4" />
                                  {r.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedRole && isBranchScopedRole(selectedRole) && (
                          <Select
                            value={selectedBranch}
                            onValueChange={(val) => setPendingBranch((prev) => ({ ...prev, [user.userId]: val }))}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="Cabang" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((b) => (
                                <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          size="sm"
                          disabled={
                            !selectedRole ||
                            (selectedRole === (user.roles[0] || "customer") &&
                              (!isBranchScopedRole(selectedRole) ||
                                selectedBranch === (user.assignedBranch ?? ""))) ||
                            (selectedRole && isBranchScopedRole(selectedRole) && !selectedBranch) ||
                            savingUserId === user.userId ||
                            !isStaff
                          }
                          onClick={() => {
                            if (selectedRole) setRole(user.userId, selectedRole, selectedBranch);
                          }}
                        >
                          {savingUserId === user.userId ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            "Set"
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPasswordDialog({ userId: user.userId, name: user.fullName || "User" })}
                          title="Ubah Password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteUserConfirm({ userId: user.userId, name: user.fullName || "User" })}
                          title="Hapus User"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>


        {/* Reset Password Dialog */}
        <Dialog open={!!passwordDialog} onOpenChange={(open) => { if (!open) { setPasswordDialog(null); setNewPassword(""); setConfirmPassword(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ubah Password</DialogTitle>
              <DialogDescription>
                Ubah password untuk <strong>{passwordDialog?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <PasswordInput
                placeholder="Password baru (min. 8 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <PasswordInput
                placeholder="Konfirmasi password baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setPasswordDialog(null); setNewPassword(""); setConfirmPassword(""); }}>
                Batal
              </Button>
              <Button onClick={handleResetPassword} disabled={isResetting || !newPassword}>
                {isResetting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirm */}
        <AlertDialog open={!!deleteUserConfirm} onOpenChange={() => setDeleteUserConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus User</AlertDialogTitle>
              <AlertDialogDescription>
                Yakin ingin menghapus akun <strong>{deleteUserConfirm?.name}</strong>? Semua data user termasuk booking, poin loyalti, dan role akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Hapus User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default UserRolesManager;
