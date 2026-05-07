import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";
import { useScopedBranches } from "@/hooks/useBranches";

type AppRole = "customer" | "admin_cabang" | "admin" | "staff";
const ROLE_LABEL: Record<AppRole, string> = {
  customer: "Customer",
  admin_cabang: "Admin Cabang",
  admin: "CS Pusat",
  staff: "Staff (Owner)",
};

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    full_name: string | null;
    phone: string | null;
  } | null;
  onSaved: () => void;
}

const EditCustomerDialog = ({ open, onOpenChange, customer, onSaved }: EditCustomerDialogProps) => {
  const { branches, isLocked, lockedBranch } = useScopedBranches();
  const { isStaff } = useUserRole();
  const [name, setName] = useState(customer?.full_name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [role, setRole] = useState<AppRole>("customer");
  const [branch, setBranch] = useState<string>("");
  const [initialRole, setInitialRole] = useState<AppRole>("customer");
  const [initialBranch, setInitialBranch] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isLocked && lockedBranch && role === "admin_cabang" && branch !== lockedBranch) {
      setBranch(lockedBranch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, lockedBranch, role]);

  useEffect(() => {
    if (!open || !customer) return;
    setName(customer.full_name || "");
    setPhone(customer.phone || "");
    (async () => {
      const [{ data: roleRows }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", customer.id),
        supabase.from("profiles").select("assigned_branch").eq("id", customer.id).maybeSingle(),
      ]);
      const rolesList = (roleRows || []).map((r: any) => r.role as AppRole);
      const primary: AppRole = rolesList.includes("staff")
        ? "staff"
        : rolesList.includes("admin")
        ? "admin"
        : rolesList.includes("admin_cabang")
        ? "admin_cabang"
        : "customer";
      setRole(primary);
      setInitialRole(primary);
      const b = (prof as any)?.assigned_branch || "";
      setBranch(b);
      setInitialBranch(b);
    })();
  }, [open, customer]);

  const handleOpen = (isOpen: boolean) => onOpenChange(isOpen);

  const handleSave = async () => {
    if (!customer) return;
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    if (isStaff && role === "admin_cabang" && !branch) {
      toast({ variant: "destructive", title: "Cabang wajib dipilih untuk Admin Cabang" });
      return;
    }
    setSaving(true);

    // 1) Update profile (name, phone, branch when applicable)
    const profilePatch: Record<string, any> = {
      full_name: name.trim(),
      phone: phone.trim() || null,
    };
    if (isStaff) {
      profilePatch.assigned_branch = role === "admin_cabang" ? branch : null;
    }
    const { error } = await supabase
      .from("profiles")
      .update(profilePatch)
      .eq("id", customer.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setSaving(false);
      return;
    }

    // 2) Sync role (only staff/owner can change it)
    if (isStaff && role !== initialRole) {
      const { data, error: roleError } = await supabase.functions.invoke("admin-user-ops", {
        body: {
          action: "set_role",
          userId: customer.id,
          role,
          assignedBranch: role === "admin_cabang" ? branch : null,
        },
      });
      if (roleError || (data as any)?.error) {
        toast({ variant: "destructive", title: "Gagal mengubah role", description: roleError?.message || (data as any)?.error });
        setSaving(false);
        return;
      }
    }

    toast({ title: "Customer updated" });
    onOpenChange(false);
    onSaved();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
          </div>

          {isStaff && (
            <>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Role Akses
                </Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">{ROLE_LABEL.customer}</SelectItem>
                    <SelectItem value="admin_cabang">{ROLE_LABEL.admin_cabang}</SelectItem>
                    <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
                    <SelectItem value="staff">{ROLE_LABEL.staff}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Staff = full access · CS Pusat = semua cabang (kecuali marketing & roles) · Admin Cabang = hanya cabang yang ditempatkan · Customer = tanpa akses dashboard.
                </p>
              </div>

              {role === "admin_cabang" && (
                <div className="grid gap-2">
                  <Label>Cabang Penempatan <span className="text-destructive">*</span></Label>
                  <Select value={branch} onValueChange={setBranch}>
                    <SelectTrigger><SelectValue placeholder="Pilih cabang" /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomerDialog;
