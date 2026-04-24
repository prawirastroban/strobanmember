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
  Car, Menu, Home, Wrench, Disc3, MapPin, CalendarCheck, ClipboardCheck,
  Package, User, Gift, Bell, LayoutDashboard, LogOut, LogIn, Moon, Sun, Globe,
  ShoppingCart, History,
} from "lucide-react";

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
  const { user, signOut } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const { isAdminOrStaff } = useUserRole();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
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

  const browseItems: NavItem[] = [
    { label: "Beranda", icon: Home, path: "/" },
    { label: "Layanan", icon: Wrench, section: "services" },
    { label: "Katalog Ban", icon: Disc3, section: "tire-catalog" },
    { label: "Cabang", icon: MapPin, section: "branches" },
  ];

  const accountItems: NavItem[] = [
    { label: "Pesan Servis", icon: CalendarCheck, path: "/booking", protected: true },
    { label: "Booking Saya", icon: ClipboardCheck, path: "/profile/history", protected: true },
    { label: "Servis & Pengingat", icon: History, path: "/profile/history-perawatan", protected: true },
    { label: "Kendaraan Saya", icon: Car, path: "/my-vehicles", protected: true },
    { label: "Loyalitas & Hadiah", icon: Gift, path: "/loyalty", protected: true },
    { label: "Keranjang", icon: ShoppingCart, path: "/checkout", protected: true },
    { label: "Profil", icon: User, path: "/profile", protected: true },
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

            {/* Account */}
            <div className="px-4 pt-5">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                Akun Saya
              </p>
              <nav className="space-y-1">
                {accountItems.map((it) => {
                  const Icon = it.icon;
                  const active = isActive(it.path);
                  return (
                    <button
                      key={it.label}
                      onClick={() => goPath(it.path!, !!it.protected)}
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
    </>
  );
};

export default DesktopSidebar;
