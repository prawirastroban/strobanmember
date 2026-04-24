import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Car, LogOut, User, Settings, Menu, Calendar, Home, Package, ClipboardCheck, Wrench, Disc3, MapPin, Moon, Sun, Globe, CalendarCheck, ShoppingCart, Gift } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
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

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const { user, signOut } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const { isStaff, isAdminOrStaff, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    setOpen(false);
    setShowSignOutDialog(false);
    await signOut();
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
    window.location.reload();
  };

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleSectionNavigate = (sectionId: string) => {
    setOpen(false);
    if (window.location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || "U";
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">{t.mobileNav.toggleMenu}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] flex flex-col p-0">
        <SheetHeader className="text-left p-6 pb-0 shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg">
              <Car className="h-5 w-5 text-primary-foreground" />
            </div>
            <span>{t.common.appName}</span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col gap-2 mt-6 px-4 pb-6 flex-1 overflow-y-auto overscroll-contain">
          {user ? (
            <>
              {/* User Card */}
              <button
                onClick={() => handleNavigate("/profile")}
                className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition text-left mb-2"
              >
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {user.user_metadata?.full_name || user.email?.split("@")[0]}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </button>

              {/* Jelajahi Section */}
              <div className="pt-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                  Jelajahi
                </p>
                <nav className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleNavigate("/")}
                  >
                    <Home className="h-4 w-4" />
                    Beranda
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleSectionNavigate("services")}
                  >
                    <Wrench className="h-4 w-4" />
                    Layanan
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleSectionNavigate("tire-catalog")}
                  >
                    <Disc3 className="h-4 w-4" />
                    Katalog Ban
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleSectionNavigate("branches")}
                  >
                    <MapPin className="h-4 w-4" />
                    Cabang
                  </Button>
                </nav>
              </div>

              {/* Akun Saya Section */}
              <div className="pt-4">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                  Akun Saya
                </p>
                <nav className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleNavigate("/booking")}
                  >
                    <CalendarCheck className="h-4 w-4" />
                    Pesan Servis
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleNavigate("/profile/history")}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Booking Saya
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleNavigate("/profile/history-perawatan")}
                  >
                    <Package className="h-4 w-4" />
                    Servis & Pengingat
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleNavigate("/my-vehicles")}
                  >
                    <Car className="h-4 w-4" />
                    Kendaraan Saya
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleNavigate("/loyalty")}
                  >
                    <Gift className="h-4 w-4" />
                    Loyalitas & Hadiah
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleNavigate("/checkout")}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Keranjang
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleNavigate("/profile")}
                  >
                    <User className="h-4 w-4" />
                    Profil
                  </Button>
                </nav>
              </div>

              {/* Staff Section */}
              {!roleLoading && isAdminOrStaff && (
                <div className="pt-4">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                    Staff
                  </p>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl w-full"
                    onClick={() => handleNavigate("/dashboard")}
                  >
                    <Settings className="h-4 w-4" />
                    Dashboard Panel
                  </Button>
                </div>
              )}

              {/* Preferences Section */}
              <div className="pt-4 pb-2">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                  Preferensi
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/60 transition">
                    <div className="flex items-center gap-3 text-sm font-medium">
                      {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      Mode Gelap
                    </div>
                    <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
                  </div>
                  <button
                    onClick={() => setLanguage(language === "id" ? "en" : "id")}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/60 transition"
                  >
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <Globe className="h-4 w-4" />
                      Bahasa
                    </div>
                    <span className="text-xs font-semibold text-primary uppercase">{language}</span>
                  </button>
                </div>
              </div>

              {/* Sign Out */}
              <div className="border-t border-border pt-4 mt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowSignOutDialog(true)}
                  className="justify-start gap-3 h-11 w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  {t.common.signOut}
                </Button>
              </div>

              <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Anda akan keluar dari sesi saat ini.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSignOut}>Keluar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              {/* Guest: Jelajahi Section */}
              <div className="pt-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                  Jelajahi
                </p>
                <nav className="flex flex-col gap-1">
                  <Button variant="ghost" className="justify-start gap-3 h-11 px-3 rounded-xl" onClick={() => handleNavigate("/")}>
                    <Home className="h-4 w-4" />
                    {t.navbar.dashboard}
                  </Button>
                  <Button variant="ghost" className="justify-start gap-3 h-11 px-3 rounded-xl" onClick={() => handleSectionNavigate("services")}>
                    <Wrench className="h-4 w-4" />
                    Layanan
                  </Button>
                  <Button variant="ghost" className="justify-start gap-3 h-11 px-3 rounded-xl" onClick={() => handleSectionNavigate("tire-catalog")}>
                    <Disc3 className="h-4 w-4" />
                    Katalog Ban
                  </Button>
                  <Button variant="ghost" className="justify-start gap-3 h-11 px-3 rounded-xl" onClick={() => handleSectionNavigate("branches")}>
                    <MapPin className="h-4 w-4" />
                    {t.branches?.title || "Cabang"}
                  </Button>
                </nav>
              </div>

              {/* Guest Sign In Prompt */}
              <div className="rounded-2xl border border-border bg-muted/40 p-4 text-center space-y-2 mt-4">
                <p className="text-sm font-semibold">Belum masuk</p>
                <p className="text-xs text-muted-foreground">
                  Masuk untuk akses booking, riwayat & loyalitas.
                </p>
                <Button
                  onClick={() => { setOpen(false); openLoginDialog(); }}
                  className="w-full"
                  size="sm"
                >
                  <User className="h-4 w-4 mr-2" />
                  Masuk / Daftar
                </Button>
              </div>

              {/* Guest Preferences */}
              <div className="pt-4 pb-2">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                  Preferensi
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/60 transition">
                    <div className="flex items-center gap-3 text-sm font-medium">
                      {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      Mode Gelap
                    </div>
                    <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
                  </div>
                  <button
                    onClick={() => setLanguage(language === "id" ? "en" : "id")}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/60 transition"
                  >
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <Globe className="h-4 w-4" />
                      Bahasa
                    </div>
                    <span className="text-xs font-semibold text-primary uppercase">{language}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
