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
import { Input } from "@/components/ui/input";
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
import { Search, RefreshCw, Shield, ShieldCheck, User, Trash2, KeyRound, UserX } from "lucide-react";

type AppRole = "admin" | "staff" | "customer";

interface UserWithRoles {
  userId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  customerId: string | null;
  roles: AppRole[];
}

const ROLE_OPTIONS: { value: AppRole; label: string; icon: typeof Shield; color: string }[] = [
  { value: "admin", label: "Admin", icon: ShieldCheck, color: "destructive" },
  { value: "staff", label: "Staff", icon: Shield, color: "default" },
  { value: "customer", label: "Customer", icon: User, color: "secondary" },
];

const UserRolesManager = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleToAdd, setRoleToAdd] = useState<AppRole>("customer");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; role: AppRole } | null>(null);
  
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
        .select("id, full_name, phone, customer_id")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const roleMap: Record<string, AppRole[]> = {};
      allRoles?.forEach((r) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role as AppRole);
      });

      const merged: UserWithRoles[] = (profiles || []).map((p) => ({
        userId: p.id,
        email: p.customer_id || p.id.substring(0, 8),
        fullName: p.full_name,
        phone: p.phone,
        customerId: p.customer_id,
        roles: roleMap[p.id] || [],
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

  const setRole = async (userId: string, role: AppRole) => {
    // Delete all existing roles first, then insert the new one
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      toast({ variant: "destructive", title: "Gagal mengubah role", description: deleteError.message });
      return;
    }

    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (insertError) {
      toast({ variant: "destructive", title: "Gagal mengubah role", description: insertError.message });
      return;
    }

    toast({ title: "Role diubah", description: `Role berhasil diubah ke ${role}` });
    setUsers((prev) =>
      prev.map((u) =>
        u.userId === userId ? { ...u, roles: [role] } : u
      )
    );
  };

  const removeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);

    if (error) {
      toast({ variant: "destructive", title: "Gagal menghapus role", description: error.message });
      return;
    }

    toast({ title: "Role dihapus", description: `Role ${role} berhasil dihapus` });
    setUsers((prev) =>
      prev.map((u) =>
        u.userId === userId ? { ...u, roles: u.roles.filter((r) => r !== role) } : u
      )
    );
    setDeleteConfirm(null);
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
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-user-ops", {
        body: { action: "reset_password", userId: passwordDialog.userId, newPassword },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

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
      const res = await supabase.functions.invoke("admin-user-ops", {
        body: { action: "delete_user", userId: deleteUserConfirm.userId },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      toast({ title: "Berhasil", description: "User berhasil dihapus" });
      setUsers((prev) => prev.filter((u) => u.userId !== deleteUserConfirm.userId));
      setDeleteUserConfirm(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal menghapus user", description: error.message });
    }
    setIsDeleting(false);
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (u.customerId?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

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
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, ID, atau telepon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Customer ID</TableHead>
                <TableHead>Role Saat Ini</TableHead>
                <TableHead>Tambah Role</TableHead>
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
                filteredUsers.map((user) => (
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
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <Badge variant="outline">Customer (default)</Badge>
                        ) : (
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={getRoleBadgeVariant(role)}
                              className="cursor-pointer gap-1"
                              onClick={() => setDeleteConfirm({ userId: user.userId, role })}
                            >
                              {ROLE_OPTIONS.find((r) => r.value === role)?.label || role}
                              <Trash2 className="h-3 w-3" />
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedUserId === user.userId ? roleToAdd : ""}
                          onValueChange={(val) => {
                            setSelectedUserId(user.userId);
                            setRoleToAdd(val as AppRole);
                          }}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Pilih role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.filter((r) => !user.roles.includes(r.value)).map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                <div className="flex items-center gap-2">
                                  <r.icon className="h-4 w-4" />
                                  {r.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          disabled={selectedUserId !== user.userId || !roleToAdd}
                          onClick={() => {
                            if (selectedUserId === user.userId && roleToAdd) {
                              addRole(user.userId, roleToAdd);
                              setSelectedUserId(null);
                            }
                          }}
                        >
                          Tambah
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
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Delete Role Confirm */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Role</AlertDialogTitle>
              <AlertDialogDescription>
                Yakin ingin menghapus role <strong>{deleteConfirm?.role}</strong> dari user ini?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirm && removeRole(deleteConfirm.userId, deleteConfirm.role)}
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
              <Input
                type="password"
                placeholder="Password baru (min. 6 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
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
