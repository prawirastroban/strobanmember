import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, MessageCircle, CheckCircle2, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";
import { useScopedBranches } from "@/hooks/useBranches";
import { invokeAdminUserOps } from "@/lib/adminUserOps";

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let p = raw.replace(/\D/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  if (p.startsWith("8")) p = "62" + p;
  if (!p.startsWith("628")) return null;
  if (p.length < 11 || p.length > 15) return null;
  const tail = p.slice(2);
  if (/^(\d)\1+$/.test(tail)) return null;
  if (tail.startsWith("000") || tail.startsWith("8000000")) return null;
  return p;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type AppRole = "customer" | "admin_cabang" | "mekanik" | "admin" | "staff";
const ROLE_LABEL: Record<AppRole, string> = {
  customer: "Customer",
  admin_cabang: "Admin Cabang",
  mekanik: "Mekanik Cabang",
  admin: "CS Pusat",
  staff: "Staff (Owner)",
};

const isBranchScopedRole = (value: AppRole) => value === "admin_cabang" || value === "mekanik";

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    full_name: string | null;
    phone: string | null;
    email?: string | null;
    phone_verified?: boolean;
  } | null;
  onSaved: () => void;
}

const EditCustomerDialog = ({ open, onOpenChange, customer, onSaved }: EditCustomerDialogProps) => {
  const { branches, isLocked, lockedBranch } = useScopedBranches();
  const { isStaff } = useUserRole();
  const [name, setName] = useState(customer?.full_name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [email, setEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [initialPhone, setInitialPhone] = useState("");
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [role, setRole] = useState<AppRole>("customer");
  const [branch, setBranch] = useState<string>("");
  const [initialRole, setInitialRole] = useState<AppRole>("customer");
  const [initialBranch, setInitialBranch] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isLocked && lockedBranch && isBranchScopedRole(role) && branch !== lockedBranch) {
      setBranch(lockedBranch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, lockedBranch, role]);

  useEffect(() => {
    if (!open || !customer) return;
    setName(customer.full_name || "");
    setPhone(customer.phone || "");
    setInitialPhone(customer.phone || "");
    const initEmail = (customer.email && customer.email !== "—") ? customer.email : "";
    setEmail(initEmail);
    setInitialEmail(initEmail);
    setPhoneVerified(!!customer.phone_verified);
    (async () => {
      const [{ data: roleRows }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", customer.id),
        supabase.from("profiles").select("assigned_branch, phone_verified, phone").eq("id", customer.id).maybeSingle(),
      ]);
      const rolesList = (roleRows || []).map((r: any) => r.role as AppRole);
      const primary: AppRole = rolesList.includes("staff")
        ? "staff"
        : rolesList.includes("admin")
        ? "admin"
        : rolesList.includes("admin_cabang")
        ? "admin_cabang"
        : rolesList.includes("mekanik")
        ? "mekanik"
        : "customer";
      setRole(primary);
      setInitialRole(primary);
      const b = (prof as any)?.assigned_branch || "";
      setBranch(b);
      setInitialBranch(b);
      if (prof) {
        setPhoneVerified(!!(prof as any).phone_verified);
        if ((prof as any).phone) {
          setPhone((prof as any).phone);
          setInitialPhone((prof as any).phone);
        }
      }
    })();
  }, [open, customer]);

  const handleOpen = (isOpen: boolean) => onOpenChange(isOpen);

  const handleSave = async () => {
    if (!customer) return;
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
      toast({ variant: "destructive", title: "Format email tidak valid" });
      return;
    }
    if (isStaff && isBranchScopedRole(role) && !branch) {
      toast({ variant: "destructive", title: "Cabang wajib dipilih untuk role cabang" });
      return;
    }
    setSaving(true);

    try {
      await invokeAdminUserOps({
        action: "update_profile",
        userId: customer.id,
        fullName: name.trim(),
        phone: phone.trim() || null,
        assignedBranch: isStaff ? (isBranchScopedRole(role) ? branch : null) : undefined,
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setSaving(false);
      return;
    }

    // 1b) Update auth email if changed
    if (trimmedEmail && trimmedEmail !== initialEmail.toLowerCase()) {
      try {
        await invokeAdminUserOps({ action: "update_email", userId: customer.id, newEmail: trimmedEmail });
      } catch (emailErr: any) {
        toast({
          variant: "destructive",
          title: "Profile tersimpan, tapi email gagal diubah",
          description: emailErr?.message,
        });
        setSaving(false);
        onSaved();
        return;
      }
      setInitialEmail(trimmedEmail);
    }

    // 2) Sync role (only staff/owner can change it)
    if (isStaff && role !== initialRole) {
      try {
        await invokeAdminUserOps({
          action: "set_role",
          userId: customer.id,
          role,
          assignedBranch: isBranchScopedRole(role) ? branch : null,
        });
      } catch (roleError: any) {
        toast({ variant: "destructive", title: "Gagal mengubah role", description: roleError?.message });
        setSaving(false);
        return;
      }
    }

    toast({ title: "Customer updated" });
    onOpenChange(false);
    onSaved();
    setSaving(false);
  };

  const handleVerifyPhone = async () => {
    if (!customer) return;
    const normalized = normalizePhone(phone);
    if (!normalized) {
      toast({ variant: "destructive", title: "Nomor WA tidak valid", description: "Gunakan format 08xx atau 628xx." });
      return;
    }
    setVerifyingPhone(true);
    try {
      const data = await invokeAdminUserOps<any>({ action: "verify_phone_wa", userId: customer.id, phone });
      const verifiedPhone = data?.phone || normalized;
      setPhone(verifiedPhone);
      setInitialPhone(verifiedPhone);
      setPhoneVerified(true);
      toast({ title: "Nomor terverifikasi", description: "Pesan konfirmasi terkirim ke WhatsApp pelanggan." });
      onSaved();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verifikasi gagal",
        description: error?.message || "Pesan WA tidak terkirim.",
      });
    } finally {
      setVerifyingPhone(false);
    }
  };

  const phoneChanged = phone !== initialPhone;
  const phoneValid = !!normalizePhone(phone);
  const showVerified = phoneVerified && !phoneChanged;

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
            <Label className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@contoh.com"
              maxLength={255}
            />
            {email && email !== initialEmail && (
              <p className="text-[11px] text-amber-600">
                Email akun login akan berubah saat disimpan.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5">
              Phone (WhatsApp)
              {showVerified && (
                <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15 border-green-500/30 gap-1 h-5 px-1.5 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" /> Terverifikasi
                </Badge>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                value={phone}
                onChange={(e) => { setPhone(e.target.value); }}
                placeholder="08xx atau 628xx"
                className="flex-1"
              />
              {!showVerified && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerifyPhone}
                  disabled={verifyingPhone || !phoneValid}
                  className="gap-1.5 shrink-0"
                  title={phoneValid ? "Kirim pesan verifikasi via WhatsApp" : "Nomor tidak valid"}
                >
                  {verifyingPhone ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                  Verifikasi WA
                </Button>
              )}
            </div>
            {!showVerified && phone && !phoneValid && (
              <p className="text-[11px] text-destructive">Format nomor tidak valid (gunakan 08xx atau 628xx).</p>
            )}
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
                    <SelectItem value="mekanik">{ROLE_LABEL.mekanik}</SelectItem>
                    <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
                    <SelectItem value="staff">{ROLE_LABEL.staff}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Staff = full access · CS Pusat = semua cabang · Admin/Mekanik Cabang = cabang penempatan · Customer = tanpa akses dashboard.
                </p>
              </div>

              {isBranchScopedRole(role) && (
                <div className="grid gap-2">
                  <Label>Cabang Penempatan <span className="text-destructive">*</span></Label>
                  <Select value={branch} onValueChange={setBranch} disabled={isLocked}>
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
