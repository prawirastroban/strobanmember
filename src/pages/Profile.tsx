import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Mail, CreditCard, Save, Loader2, Camera, History, ChevronRight, Gift, Car, Pencil, LogOut, Share2, Ticket, Wallet, HelpCircle, MessageSquare, ShieldCheck, ChevronsRight } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import { openWhatsApp } from "@/lib/whatsapp";
import NotificationPermissionBanner from "@/components/NotificationPermissionBanner";
import AppVersionBadge from "@/components/AppVersionBadge";
import heroBengkel from "@/assets/hero-bengkel.jpg";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [points, setPoints] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Auto-open edit dialog & focus phone when phone is missing or hash is #phone
  useEffect(() => {
    if (loading) return;
    const wantsPhone = window.location.hash === "#phone";
    const phoneEmpty = !phone || phone.trim().length < 8;
    if (wantsPhone || phoneEmpty) {
      setEditOpen(true);
      setTimeout(() => phoneInputRef.current?.focus(), 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch { /* ignore */ }
      window.location.href = "/";
    } catch (e) {
      setSigningOut(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, customer_id, avatar_url, referral_code, is_verified")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setCustomerId(data.customer_id || "");
        setAvatarUrl(data.avatar_url || null);
        setReferralCode((data as any).referral_code || null);
        setIsVerified(!!(data as any).is_verified);
      }
      if (error) console.error("Error fetching profile:", error);
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("loyalty_points")
        .select("total_points")
        .eq("user_id", user.id)
        .maybeSingle();
      setPoints(data?.total_points || 0);
    };
    fetchPoints();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: t.profile.invalidFileType, description: t.profile.invalidFileTypeDesc, variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t.profile.fileTooLarge, description: t.profile.fileTooLargeDesc, variant: "destructive" });
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: t.profile.uploadFailed, description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const newUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", user.id);

    if (updateError) {
      toast({ title: t.profile.failedToSaveAvatar, description: updateError.message, variant: "destructive" });
    } else {
      setAvatarUrl(newUrl);
      toast({ title: t.profile.profilePhotoUpdated });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      toast({ title: t.profile.nameRequired, variant: "destructive" });
      setSaving(false);
      return;
    }
    if (trimmedName.length > 100) {
      toast({ title: t.profile.nameTooLong, variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("profiles").update({ full_name: trimmedName, phone: trimmedPhone || null }).eq("id", user.id);

    if (error) {
      toast({ title: t.profile.failedToUpdate, description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.profile.profileUpdated });
      setEditOpen(false);
    }
    setSaving(false);
  };

  const getInitials = () => {
    if (fullName) return fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    return user?.email?.slice(0, 2).toUpperCase() || "U";
  };

  const memberTier = points >= 2000 ? "Gold Member" : points >= 500 ? "Silver Member" : "Basic Member";

  const menuGroups: {
    title: string;
    items: { icon: typeof Car; label: string; note?: string; onClick: () => void }[];
  }[] = [
    {
      title: "Profil saya",
      items: [
        { icon: History, label: "Riwayat Servis Mobil", onClick: () => navigate("/profile/history-perawatan") },
        { icon: Car, label: "Kendaraan Saya", onClick: () => navigate("/my-vehicles") },
      ],
    },
    {
      title: "Promo dan Hadiah",
      items: [
        { icon: Wallet, label: "Saldo Stroban", onClick: () => navigate("/referral") },
        { icon: Gift, label: "Poin Servis", onClick: () => navigate("/loyalty") },
        { icon: Ticket, label: "Voucher Saya", onClick: () => navigate("/loyalty#voucher") },
        {
          icon: Share2,
          label: "Program Referral",
          note: !isVerified || !referralCode ? "Perlu verifikasi akun" : undefined,
          onClick: () => navigate("/referral"),
        },
      ],
    },
    {
      title: "Lainnya",
      items: [
        {
          icon: HelpCircle,
          label: "Bantuan & Pengaduan",
          onClick: () => openWhatsApp({ text: "Halo Bengkel Mobil Stroban, saya butuh bantuan." }),
        },
        { icon: MessageSquare, label: "Beri Rating", onClick: () => navigate("/feedback") },
        { icon: ShieldCheck, label: "Kebijakan Privasi", onClick: () => navigate("/legal/privacy") },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Banner */}
      <div className="relative h-[150px] w-full overflow-hidden">
        <img src={heroBengkel} alt="Bengkel Mobil Stroban" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-foreground/20" />
      </div>

      <main className="container mx-auto px-4 pb-32 md:pb-10 max-w-xl space-y-5 -mt-16 relative">
        {/* Identity card */}
        <Card className="rounded-2xl border-border/60 shadow-lg overflow-hidden">
          <CardContent className="p-4 relative">
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Edit profil"
              className="absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <Avatar className="h-16 w-16 ring-2 ring-primary">
                  <AvatarImage src={avatarUrl || undefined} alt="Foto profil" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">{getInitials()}</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Ubah foto"
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
                >
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <h1 className="text-[19px] font-extrabold text-primary leading-tight truncate">
                  {fullName || t.common.member}
                </h1>
                <p className="text-[12px] text-muted-foreground truncate">{user?.email}</p>
                {phone && <p className="text-[12px] text-muted-foreground truncate">{phone}</p>}
                {customerId && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
                    <CreditCard className="h-3 w-3" /> {customerId}
                  </span>
                )}
              </div>

              <div className="shrink-0 border-l border-border/60 pl-3 text-center">
                <p className="text-[10.5px] font-bold text-primary leading-tight">Servis<br />Poin</p>
                <p className="text-[26px] font-extrabold text-primary leading-none mt-1">
                  {points}
                  <span className="text-[11px] align-top ml-0.5">pt</span>
                </p>
                <span className="mt-1.5 inline-block px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-semibold whitespace-nowrap">
                  {memberTier}
                </span>
              </div>
            </div>
          </CardContent>

          <button
            onClick={() => navigate("/loyalty")}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-white active:brightness-95 transition"
          >
            <span className="text-[14px] font-extrabold tracking-tight">
              Join STROBAN <em className="font-semibold">PREMIUM</em> Club
            </span>
            <ChevronsRight className="h-5 w-5" />
          </button>
        </Card>

        <NotificationPermissionBanner />

        {/* Menu groups */}
        {menuGroups.map((group) => (
          <section key={group.title} className="space-y-2">
            <h2 className="text-[13px] font-extrabold text-primary">{group.title}</h2>
            <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden divide-y divide-border/60">
              {group.items.map(({ icon: Icon, label, note, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60 active:bg-muted transition-colors text-left"
                >
                  <Icon className="h-5 w-5 text-foreground shrink-0" strokeWidth={2} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14.5px] tracking-tight truncate">{label}</p>
                    {note && <p className="text-[11px] text-muted-foreground truncate">{note}</p>}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </Card>
          </section>
        ))}

        <Button
          onClick={() => setLogoutOpen(true)}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-extrabold text-[16px] hover:brightness-110"
        >
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>

        {/* App version */}
        <AppVersionBadge variant="card" />

      </main>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-3xl max-w-md p-0 overflow-hidden border-border/60">
          <DialogHeader className="px-6 pt-6 pb-2 text-center sm:text-center">
            <DialogTitle className="text-[18px] font-semibold tracking-tight">{t.profile.accountDetails}</DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground">
              {t.profile.emailCantChange}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-3 space-y-4">
            <div>
              <Label htmlFor="email" className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> {t.profile.emailLabel}
              </Label>
              <Input id="email" value={user?.email || ""} disabled className="bg-muted/60 rounded-xl h-11 mt-1 text-sm" />
            </div>
            <div>
              <Label htmlFor="fullName" className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <User className="h-3 w-3" /> {t.profile.fullNameLabel}
              </Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t.profile.fullNamePlaceholder} maxLength={100} className="rounded-xl h-11 mt-1 text-sm" />
            </div>
            <div>
              <Label htmlFor="phone" className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {t.profile.phoneLabel}
                {(!phone || phone.trim().length < 8) && (
                  <span className="ml-1 text-[10px] font-semibold text-[#ff2b2b]">• Wajib diisi</span>
                )}
              </Label>
              <Input
                id="phone"
                ref={phoneInputRef}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.profile.phonePlaceholder}
                maxLength={20}
                className={`rounded-xl h-11 mt-1 text-sm ${
                  !phone || phone.trim().length < 8
                    ? "ring-2 ring-[#ff2b2b]/60 focus-visible:ring-[#ff2b2b] shadow-[0_0_14px_rgba(255,43,43,0.35)]"
                    : ""
                }`}
              />
              {(!phone || phone.trim().length < 8) && (
                <p className="text-[10.5px] text-muted-foreground mt-1.5">
                  Nomor WhatsApp dipakai untuk konfirmasi booking, reminder service, dan reset password.
                </p>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-full font-semibold text-[14px] mt-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sign out confirmation */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan diarahkan ke halaman utama dan harus masuk kembali untuk mengakses fitur akun Anda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut} className="rounded-full">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} disabled={signingOut} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {signingOut ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Keluar...</> : <><LogOut className="h-4 w-4 mr-2" />Keluar</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Profile;
