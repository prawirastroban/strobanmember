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
import { User, Phone, Mail, CreditCard, Save, Loader2, Camera, History, ChevronRight, Gift, Car, Calendar, Pencil, LogOut, Share2, Copy, Check, ShieldAlert } from "lucide-react";
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
import NotificationPrefsCard from "@/components/NotificationPrefsCard";

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
  const [copied, setCopied] = useState(false);
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

  const referralLink = referralCode ? `https://www.bengkelstroban.com/?ref=${referralCode}` : "";

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: "Link referral disalin" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Gagal menyalin", variant: "destructive" });
    }
  };

  const handleShareWA = () => {
    if (!referralCode) return;
    const text = `Servis mobil di Sahabat Stroban yuk! Pakai kode referral saya *${referralCode}* atau buka link: ${referralLink}`;
    openWhatsApp({ text });
  };

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
      <main className="container mx-auto px-4 pt-6 pb-32 md:pb-10 max-w-xl space-y-5">
        <NotificationPermissionBanner />
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-semibold tracking-tight leading-none">{t.profile.title}</h1>
        </div>

        {/* Hero identity card — Apple style */}
        <Card className="rounded-3xl border-border/60 shadow-sm overflow-hidden bg-gradient-to-b from-primary/5 to-card">
          <CardContent className="p-6 flex flex-col items-center text-center relative">
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Edit profil"
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/70 border border-border/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <div className="relative group">
              <Avatar className="h-20 w-20 ring-4 ring-background shadow-md">
                <AvatarImage src={avatarUrl || undefined} alt="Profile photo" />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">{getInitials()}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Ubah foto"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <h2 className="mt-3 text-[18px] font-semibold tracking-tight">{fullName || t.common.member}</h2>
            <p className="text-[13px] text-muted-foreground">{user?.email}</p>
            {customerId && (
              <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/70 border border-border/60 text-[11px] font-medium text-muted-foreground">
                <CreditCard className="h-3 w-3" /> {customerId}
              </span>
            )}
          </CardContent>
        </Card>

        {/* Referral program card */}
        {isVerified && referralCode ? (
          <Card className="rounded-3xl border-border/60 shadow-sm overflow-hidden bg-gradient-to-br from-primary/10 via-card to-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-primary font-semibold flex items-center gap-1.5">
                    <Share2 className="h-3 w-3" /> Program Referral
                  </p>
                  <h3 className="text-[16px] font-semibold tracking-tight mt-0.5">Ajak teman, dapatkan komisi</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Dapatkan bonus saat teman daftar & komisi tiap booking lunas.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-background/70 border border-border/60">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Kode Anda</p>
                  <p className="font-mono text-[15px] font-semibold tracking-wider truncate">{referralCode}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyCode}
                  className="rounded-full h-8 px-3 text-[12px]"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="ml-1.5">{copied ? "Disalin" : "Salin"}</span>
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleShareWA}
                  className="flex-1 h-10 rounded-full bg-[#25D366] hover:bg-[#1eb858] text-white font-semibold text-[13px]"
                >
                  <Share2 className="h-4 w-4 mr-1.5" /> Bagikan via WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/referral")}
                  className="h-10 rounded-full text-[13px]"
                >
                  Saldo
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl border-border/60 shadow-sm overflow-hidden">
            <CardContent className="p-5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold tracking-tight">Program Referral menanti</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Akun Anda perlu diverifikasi terlebih dahulu untuk mendapat kode referral & komisi.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu group — Apple Settings style */}
        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden divide-y divide-border/60">
          {[
            { icon: History, label: "Servis & Pengingat", desc: "Riwayat, jadwal mendatang & reminder berkala", to: "/profile/history-perawatan", tint: "bg-primary/10 text-primary" },
            { icon: Car, label: "Kendaraan Saya", desc: "Kelola data mobil & perawatan", to: "/my-vehicles", tint: "bg-emerald-500/10 text-emerald-500" },
            { icon: Gift, label: "Loyalitas & Hadiah", desc: "Poin & tukar dengan diskon", to: "/loyalty", tint: "bg-amber-500/10 text-amber-500" },
            { icon: Share2, label: "Program Referral", desc: "Komisi, tarik tunai & voucher", to: "/referral", tint: "bg-rose-500/10 text-rose-500" },
          ].map(({ icon: Icon, label, desc, to, tint }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60 active:bg-muted transition-colors text-left"
            >
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${tint}`}>
                <Icon className="h-4.5 w-4.5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[14px] tracking-tight truncate">{label}</p>
                <p className="text-[11.5px] text-muted-foreground truncate">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </Card>

        <NotificationPrefsCard />

        {/* Sign out */}
        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
          <button
            onClick={() => setLogoutOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-destructive/5 active:bg-destructive/10 transition-colors text-left"
          >
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-destructive/10 text-destructive">
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[14px] tracking-tight text-destructive">Keluar</p>
              <p className="text-[11.5px] text-muted-foreground truncate">Keluar dari akun Anda di perangkat ini</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </Card>

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
