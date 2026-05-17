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
import { CarFront, LogOut, User, Settings, Menu, Home, ClipboardCheck, MapPin, Moon, Sun, Globe, CalendarCheck, Gift, Tag, LayoutGrid, MessageSquareWarning } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import PublicFeedbackForm from "@/components/feedback/PublicFeedbackForm";

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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
    <>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">{t.mobileNav.toggleMenu}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[320px] sm:w-[360px] flex flex-col p-0">
        <SheetHeader className="text-left p-5 pb-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary rounded-lg">
              <CarFront className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">{t.common.appName}</span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col gap-2 mt-6 px-4 pb-6 flex-1 overflow-y-auto overscroll-contain">
          {user ? (
            <>
              {/* User Card */}
              <button
                onClick={() => handleNavigate("/profile")}
                className="flex items-center gap-3 px-3 py-2.5 mx-0 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition text-left mb-2 w-full max-w-full overflow-hidden"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-sm font-semibold truncate leading-tight">
                    {user.user_metadata?.full_name || user.email?.split("@")[0]}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{user.email}</p>
                </div>
              </button>

              {/* Menu Section — only essentials */}
              <div className="pt-3">
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
                    onClick={() => handleNavigate("/promo")}
                  >
                    <Tag className="h-4 w-4" />
                    Promo
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleNavigate("/katalog")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Katalog Layanan
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-11 px-3 rounded-xl"
                    onClick={() => handleNavigate("/cabang")}
                  >
                    <MapPin className="h-4 w-4" />
                    Lokasi Cabang
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

              {/* Bantuan */}
              <div className="pt-4">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                  Bantuan
                </p>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-11 px-3 rounded-xl w-full"
                  onClick={() => { setOpen(false); setFeedbackOpen(true); }}
                >
                  <MessageSquareWarning className="h-4 w-4" />
                  Kirim Feedback
                </Button>
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
              {/* Guest menu */}
              <div className="pt-3">
                <nav className="flex flex-col gap-1">
                  <Button variant="ghost" className="justify-start gap-3 h-11 px-3 rounded-xl" onClick={() => handleNavigate("/")}>
                    <Home className="h-4 w-4" />
                    {t.navbar.dashboard}
                  </Button>
                  <Button variant="ghost" className="justify-start gap-3 h-11 px-3 rounded-xl" onClick={() => handleNavigate("/katalog")}>
                    <LayoutGrid className="h-4 w-4" />
                    Katalog Layanan
                  </Button>
                  <Button variant="ghost" className="justify-start gap-3 h-11 px-3 rounded-xl" onClick={() => handleNavigate("/cabang")}>
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

              {/* Bantuan (guest) */}
              <div className="pt-4">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                  Bantuan
                </p>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-11 px-3 rounded-xl w-full"
                  onClick={() => { setOpen(false); setFeedbackOpen(true); }}
                >
                  <MessageSquareWarning className="h-4 w-4" />
                  Kirim Feedback
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
    <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareWarning className="h-5 w-5 text-primary" />
            Kirim Feedback / Laporkan Bug
          </DialogTitle>
          <DialogDescription>
            Sampaikan masukan, revisi, atau bug yang Anda temukan.
          </DialogDescription>
        </DialogHeader>
        <PublicFeedbackForm onSubmitted={() => setTimeout(() => setFeedbackOpen(false), 1500)} />
      </DialogContent>
    </Dialog>
    </>
  );
};

export default MobileNav;
