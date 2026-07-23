import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import PublicFeedbackForm from "@/components/feedback/PublicFeedbackForm";
import {
  Car, Menu, Home, Wrench, Disc3, MapPin, CalendarCheck, ClipboardCheck,
  Package, User, Gift, Bell, LayoutDashboard, LogOut, LogIn, Moon, Sun, Globe,
  ShoppingCart, History, LayoutGrid, MessageSquareWarning, Download, Share, Plus,
} from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { toast } from "sonner";

interface NavItem {
  label: string;
  icon: typeof Car;
  path?: string;
  section?: string;
  protected?: boolean;
}

const DesktopSidebar = () => {
  const [open, setOpen] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const { isAdminOrStaff } = useUserRole();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { canPrompt, isIOS, promptInstall, show: showInstall } = useInstallPrompt();
  const navigate = useNavigate();
  const location = useLocation();

  const close = () => setOpen(false);

  const goPath = (path: string, requiresAuth = false) => {
    close();
    if (requiresAuth && !user) { openLoginDialog(path); return; }
    navigate(path);
  };

  const goSection = (id: string) => {
    close();
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 300);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSignOut = async () => {
    setOpen(false);
    setShowSignOutDialog(false);
    await signOut();
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
    window.location.reload();
  };

  const initials = (() => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || "U";
  })();

  const handleInstallClick = async () => {
    if (canPrompt) {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        toast.success("Aplikasi sedang dipasang…");
        close();
      } else if (outcome === "dismissed") {
        toast("Pemasangan dibatalkan");
      } else {
        setInstallGuideOpen(true);
      }
    } else {
      setInstallGuideOpen(true);
    }
  };

  const browseItems: NavItem[] = [
    { label: "Beranda", icon: Home, path: "/" },
    { label: "Katalog Layanan", icon: LayoutGrid, path: "/katalog" },
    { label: "Layanan", icon: Wrench, section: "services" },
    { label: "Cabang", icon: MapPin, path: "/cabang" },
  ];

  const itemBtnClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.99] ${
      active
        ? "bg-primary/10 text-primary"
        : "text-foreground hover:bg-muted/60"
    }`;

  const isActive = (path?: string) => !!path && location.pathname === path;

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[320px] sm:w-[360px] flex flex-col p-0">
          <SheetHeader className="text-left p-5 pb-4 border-b border-border shrink-0">
            <SheetTitle className="flex items-center gap-2.5">
              <div className="p-1.5 bg-primary rounded-lg">
                <Car className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold">{t.common.appName}</span>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* User card */}
            <div className="px-4 pt-4">
              {user ? (
                <button
                  onClick={() => goPath("/profile", true)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition text-left"
                >
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {user.user_metadata?.full_name || user.email?.split("@")[0]}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </button>
              ) : (
                <div className="rounded-2xl border border-border bg-muted/40 p-4 text-center space-y-2">
                  <p className="text-sm font-semibold">Belum masuk</p>
                  <p className="text-xs text-muted-foreground">
                    Masuk untuk akses booking, riwayat & loyalitas.
                  </p>
                  <Button
                    onClick={() => { close(); openLoginDialog(); }}
                    className="w-full"
                    size="sm"
                  >
                    <LogIn className="h-4 w-4" />
                    Masuk / Daftar
                  </Button>
                </div>
              )}
            </div>

            {/* Browse */}
            <div className="px-4 pt-5">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                Jelajahi
              </p>
              <nav className="space-y-1">
                {browseItems.map((it) => {
                  const Icon = it.icon;
                  const active = isActive(it.path);
                  return (
                    <button
                      key={it.label}
                      onClick={() =>
                        it.section ? goSection(it.section) : goPath(it.path!, false)
                      }
                      className={itemBtnClass(active)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">{it.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Admin */}
            {isAdminOrStaff && (
              <div className="px-4 pt-5">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                  Staff
                </p>
                <button
                  onClick={() => goPath("/dashboard")}
                  className={itemBtnClass(location.pathname.startsWith("/dashboard"))}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">Dashboard Panel</span>
                </button>
              </div>
            )}

            {/* Preferences */}
            <div className="px-4 pt-5 pb-4">
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
                  <span className="text-xs font-semibold text-primary uppercase">
                    {language}
                  </span>
                </button>
              </div>
            </div>

            {/* Bantuan */}
            <div className="px-4 pb-5">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                Bantuan
              </p>
              <button
                onClick={() => { close(); setFeedbackOpen(true); }}
                className={itemBtnClass(false)}
              >
                <MessageSquareWarning className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">Kirim Feedback</span>
              </button>
            </div>

            {/* Aplikasi */}
            {showInstall && (
              <div className="px-4 pb-5">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                  Aplikasi
                </p>
                <button
                  onClick={handleInstallClick}
                  className={itemBtnClass(false)}
                >
                  <Download className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1 text-left">Install App</span>
                  <span className="text-[10px] font-semibold text-primary uppercase">
                    {canPrompt ? "Siap" : isIOS ? "iOS" : "Panduan"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {user && (
            <div className="border-t border-border p-4 shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowSignOutDialog(true)}
                className="w-full"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

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

      <Dialog open={installGuideOpen} onOpenChange={setInstallGuideOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Pasang Aplikasi
            </DialogTitle>
            <DialogDescription>
              Pasang Bengkel Mobil Stroban di layar utama untuk akses cepat seperti aplikasi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                📱 iPhone / iPad (Safari)
              </p>
              <ol className="text-sm text-muted-foreground space-y-1.5 pl-1">
                <li>1. Buka di <b>Safari</b> (bukan Chrome).</li>
                <li>2. Ketuk ikon <Share className="inline h-3.5 w-3.5" /> <b>Share</b> di bawah.</li>
                <li>3. Pilih <b>"Add to Home Screen"</b>.</li>
                <li>4. Ketuk <b>Add</b> di kanan atas.</li>
              </ol>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                🤖 Android (Chrome / Edge)
              </p>
              <ol className="text-sm text-muted-foreground space-y-1.5 pl-1">
                <li>1. Ketuk menu <b>⋮</b> di kanan atas browser.</li>
                <li>2. Pilih <b>"Install app"</b> atau <b>"Add to Home screen"</b>.</li>
                <li>3. Konfirmasi <b>Install</b>.</li>
              </ol>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                💻 Desktop (Chrome / Edge)
              </p>
              <ol className="text-sm text-muted-foreground space-y-1.5 pl-1">
                <li>1. Klik ikon <Plus className="inline h-3.5 w-3.5" /> <b>Install</b> di ujung kanan address bar.</li>
                <li>2. Klik <b>Install</b>.</li>
              </ol>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Setelah dipasang, ikon aplikasi akan muncul di layar utama / desktop Anda.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DesktopSidebar;
