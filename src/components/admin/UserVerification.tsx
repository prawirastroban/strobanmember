import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, ShieldCheck, UserCheck, Loader2 } from "lucide-react";
import { isActionNeeded } from "@/lib/actionNeeded";
import FilterBarV2, { type QuickChip, type ActiveChip } from "./filters/FilterBarV2";

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_verified: boolean;
  created_at: string;
  email?: string;
}

const UserVerification = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "action" | "verified" | "unverified" | "new">("all");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, is_verified, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setIsLoading(false);
      return;
    }

    // Fetch emails from bookings as a workaround (profiles don't store email)
    const profiles = (data || []) as UserProfile[];
    
    // Try to get emails from bookings
    const userIds = profiles.map(p => p.id);
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("user_id, customer_email")
      .in("user_id", userIds);
    
    const emailMap: Record<string, string> = {};
    (bookingsData || []).forEach((b: any) => {
      if (!emailMap[b.user_id]) emailMap[b.user_id] = b.customer_email;
    });

    setUsers(profiles.map(p => ({ ...p, email: emailMap[p.id] || "—" })));
    setIsLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("user-verification-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchUsers();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVerify = async (userId: string) => {
    setVerifyingId(userId);

    const { data, error } = await supabase.functions.invoke("admin-user-ops", {
      body: { action: "verify_user", userId },
    });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setVerifyingId(null);
      setConfirmUser(null);
      return;
    }

    const result = data as any;
    if (!result?.success) {
      toast({ variant: "destructive", title: "Error", description: result?.error || "Unknown error" });
      setVerifyingId(null);
      setConfirmUser(null);
      return;
    }

    toast({ title: "✅ Berhasil", description: "User berhasil diverifikasi dan akun login sudah aktif" });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: true } : u));
    setVerifyingId(null);
    setConfirmUser(null);
  };

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const filtered = users
    .filter(u => {
      const q = searchQuery.toLowerCase();
      if (q && !((u.full_name?.toLowerCase().includes(q) ?? false) ||
                 (u.phone?.toLowerCase().includes(q) ?? false) ||
                 (u.email?.toLowerCase().includes(q) ?? false))) return false;
      if (statusFilter === "action" && !isActionNeeded("verification", u)) return false;
      if (statusFilter === "verified" && !u.is_verified) return false;
      if (statusFilter === "unverified" && u.is_verified) return false;
      if (statusFilter === "new" && (now - new Date(u.created_at).getTime() > DAY)) return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      const ap = isActionNeeded("verification", a) ? 0 : 1;
      const bp = isActionNeeded("verification", b) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const unverifiedCount = users.filter(u => !u.is_verified).length;
  const verifiedCount = users.filter(u => u.is_verified).length;
  const newCount = users.filter(u => now - new Date(u.created_at).getTime() <= DAY).length;

  const quickChips: QuickChip[] = [
    { key: "action", label: "⚡ Perlu Aksi", active: statusFilter === "action", count: unverifiedCount, onClick: () => setStatusFilter(statusFilter === "action" ? "all" : "action") },
    { key: "verified", label: "✅ Verified", active: statusFilter === "verified", count: verifiedCount, onClick: () => setStatusFilter(statusFilter === "verified" ? "all" : "verified") },
    { key: "unverified", label: "⏳ Unverified", active: statusFilter === "unverified", count: unverifiedCount, onClick: () => setStatusFilter(statusFilter === "unverified" ? "all" : "unverified") },
    { key: "new", label: "🆕 Pendaftar Baru", active: statusFilter === "new", count: newCount, onClick: () => setStatusFilter(statusFilter === "new" ? "all" : "new") },
  ];
  const activeChips: ActiveChip[] = [];
  if (statusFilter !== "all") {
    const labelMap: Record<string, string> = { action: "Perlu Aksi", verified: "Verified", unverified: "Unverified", new: "Pendaftar Baru" };
    activeChips.push({ key: "sf", label: labelMap[statusFilter], onRemove: () => setStatusFilter("all") });
  }
  const isActiveFilter = activeChips.length > 0 || !!searchQuery;
  const resetAll = () => { setStatusFilter("all"); setSearchQuery(""); };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> User Verification
              </CardTitle>
              <CardDescription>
                Verify new user accounts • {unverifiedCount} unverified user{unverifiedCount !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            {unverifiedCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {unverifiedCount} menunggu
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <FilterBarV2
                search={{ placeholder: "Cari nama, email, telepon...", value: searchQuery, onChange: setSearchQuery }}
                quickChips={quickChips}
                activeChips={activeChips}
                resultCount={filtered.length}
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
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Tanggal Daftar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada user ditemukan</TableCell></TableRow>
                ) : (
                  filtered.map((user) => (
                    <TableRow key={user.id} className={!user.is_verified ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.phone || "—"}</TableCell>
                      <TableCell className="text-sm">{format(new Date(user.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell>
                        {user.is_verified ? (
                          <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <UserCheck className="h-3 w-3 mr-1" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="animate-pulse">
                            Unverified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!user.is_verified && (
                          <Button
                            size="sm"
                            onClick={() => setConfirmUser(user)}
                            disabled={verifyingId === user.id}
                            className="gap-1"
                          >
                            {verifyingId === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <UserCheck className="h-3 w-3" />
                            )}
                            Verify
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmUser} onOpenChange={(open) => !open && setConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Verifikasi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin memverifikasi akun <strong>{confirmUser?.full_name || "user ini"}</strong>?
              User akan dapat melakukan booking setelah diverifikasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmUser && handleVerify(confirmUser.id)}>
              Ya, Verifikasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserVerification;
