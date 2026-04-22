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
import { Car, LogOut, User, Settings, Menu, Calendar, Home, Package, ClipboardCheck, Wrench, Disc3, MapPin, Moon, Sun, Globe } from "lucide-react";
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
        
        <div className="flex flex-col gap-4 mt-8 px-6 pb-6 flex-1 overflow-y-auto overscroll-contain">
          {user ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">
                    {user.user_metadata?.full_name || t.common.member}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {user.email}
                  </span>
                </div>
              </div>

              <nav className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-12"
                  onClick={() => handleNavigate("/")}
                >
                  <Home className="h-5 w-5" />
                  {t.navbar.dashboard}
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-12"
                  onClick={() => handleSectionNavigate("services")}
                >
                  <Wrench className="h-5 w-5" />
                  {t.catalog?.label || "Layanan"}
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-12"
                  onClick={() => handleSectionNavigate("tire-catalog")}
                >
                  <Disc3 className="h-5 w-5" />
                  {t.tireCatalog?.navLabel || "Katalog Ban"}
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-12"
                  onClick={() => handleSectionNavigate("branches")}
                >
                  <MapPin className="h-5 w-5" />
                  {t.branches?.title || "Cabang"}
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-12"
                  onClick={() => handleNavigate("/booking")}
                >
                  <Calendar className="h-5 w-5" />
                  {t.mobileNav.bookService}
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-12"
                  onClick={() => handleNavigate("/profile/history-perawatan")}
                >
                  <ClipboardCheck className="h-5 w-5" />
                  History Perawatan
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-12"
                  onClick={() => handleNavigate("/my-vehicles")}
                >
                  <Car className="h-5 w-5" />
                  Kendaraan Saya
                </Button>
                {!roleLoading && isAdminOrStaff && (
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-12"
                    onClick={() => handleNavigate("/dashboard")}
                  >
                    <Settings className="h-5 w-5" />
                    Dashboard Panel
                  </Button>
                )}
              </nav>

              <div className="mt-auto pt-4 border-t">
                {/* Theme toggle */}
                <div className="flex items-center justify-between gap-3 px-3 h-12 rounded-lg hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Moon className="h-5 w-5" />
                    ) : (
                      <Sun className="h-5 w-5" />
                    )}
                    <span className="text-sm font-medium">
                      {theme === "dark" ? "Mode Gelap" : "Mode Terang"}
                    </span>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={toggleTheme}
                    aria-label="Toggle theme"
                  />
                </div>

                {/* Language switcher */}
                <div className="flex items-center justify-between gap-3 px-3 h-12 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5" />
                    <span className="text-sm font-medium">{t.language.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant={language === "id" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setLanguage("id")}
                    >
                      🇮🇩 ID
                    </Button>
                    <Button
                      type="button"
                      variant={language === "en" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setLanguage("en")}
                    >
                      🇬🇧 EN
                    </Button>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-12 w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowSignOutDialog(true)}
                >
                  <LogOut className="h-5 w-5" />
                  {t.common.signOut}
                </Button>
              </div>

              <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
                    <AlertDialogDescription>
                      Apakah Anda yakin ingin keluar dari akun ini?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSignOut}>Ya, Keluar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <nav className="flex flex-col gap-1">
                <Button variant="ghost" className="justify-start gap-3 h-12" onClick={() => handleNavigate("/")}>
                  <Home className="h-5 w-5" />
                  {t.navbar.dashboard}
                </Button>
                <Button variant="ghost" className="justify-start gap-3 h-12" onClick={() => handleSectionNavigate("services")}>
                  <Wrench className="h-5 w-5" />
                  {t.catalog?.label || "Layanan"}
                </Button>
                <Button variant="ghost" className="justify-start gap-3 h-12" onClick={() => handleSectionNavigate("tire-catalog")}>
                  <Disc3 className="h-5 w-5" />
                  {t.tireCatalog?.navLabel || "Katalog Ban"}
                </Button>
                <Button variant="ghost" className="justify-start gap-3 h-12" onClick={() => handleSectionNavigate("branches")}>
                  <MapPin className="h-5 w-5" />
                  {t.branches?.title || "Cabang"}
                </Button>
              </nav>
              <p className="text-sm text-muted-foreground px-3">
                {t.mobileNav.signInToManage}
              </p>
              <Button onClick={() => { setOpen(false); openLoginDialog(); }} className="w-full">
                <User className="mr-2 h-4 w-4" />
                {t.common.signIn}
              </Button>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between gap-3 px-3 h-12 rounded-lg hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Moon className="h-5 w-5" />
                    ) : (
                      <Sun className="h-5 w-5" />
                    )}
                    <span className="text-sm font-medium">
                      {theme === "dark" ? "Mode Gelap" : "Mode Terang"}
                    </span>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={toggleTheme}
                    aria-label="Toggle theme"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 h-12 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5" />
                    <span className="text-sm font-medium">{t.language.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant={language === "id" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setLanguage("id")}
                    >
                      🇮🇩 ID
                    </Button>
                    <Button
                      type="button"
                      variant={language === "en" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setLanguage("en")}
                    >
                      🇬🇧 EN
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
