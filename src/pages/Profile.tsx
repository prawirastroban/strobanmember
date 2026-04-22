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
import { User, Phone, Mail, CreditCard, Save, Loader2, Camera, History, ChevronRight, Gift, Car, Calendar, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, customer_id, avatar_url")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setCustomerId(data.customer_id || "");
        setAvatarUrl(data.avatar_url || null);
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
      <main className="container mx-auto px-4 pt-6 pb-10 max-w-xl space-y-5">
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

        {/* Menu group — Apple Settings style */}
        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden divide-y divide-border/60">
          {[
            { icon: Calendar, label: "Booking Saya", desc: "Pesanan aktif & jadwal mendatang", to: "/my-booking", tint: "bg-blue-500/10 text-blue-500" },
            { icon: History, label: "History Perawatan", desc: "Riwayat servis, bukti bayar & invoice", to: "/profile/history-perawatan", tint: "bg-primary/10 text-primary" },
            { icon: Car, label: "Kendaraan Saya", desc: "Kelola data mobil & perawatan", to: "/my-vehicles", tint: "bg-emerald-500/10 text-emerald-500" },
            { icon: Gift, label: "Loyalitas & Hadiah", desc: "Poin & tukar dengan diskon", to: "/loyalty", tint: "bg-amber-500/10 text-amber-500" },
          ].map(({ icon: Icon, label, desc, to, tint }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/60 active:bg-accent transition-colors text-left"
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
              </Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.profile.phonePlaceholder} maxLength={20} className="rounded-xl h-11 mt-1 text-sm" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-full font-semibold text-[14px] mt-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
